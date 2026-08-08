import type {
  ApproveTenantPlanChangeRequest,
  AuthTokenPayload,
  BaseRequest,
  BaseResponse,
  CreateTenantSubscriptionPaymentRequest,
  PlatformPlanInterface,
  RequestTenantPlanChangeRequest,
  ReviewTenantSubscriptionPaymentRequest,
  TenantBillingSummaryInterface,
  TenantInvoiceInterface,
  UpdatePlatformPlanRequest,
} from "@monorepo/types";
import type { PoolClient } from "pg";

import { tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { requireCurrentTenantId } from "../utils/tenant-scope";
import {
  discardTenantFile,
  getTenantFile,
  getTenantFileForPlatform,
  type StoredTenantFile,
  storeTenantFile,
} from "./file-object-service";

const MAX_PROOF_SIZE = 5 * 1024 * 1024;

const paging = (request: BaseRequest) => {
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(request.metadata?.pageSize || 10), 1), 100);
  return { offset: (page - 1) * pageSize, page, pageSize };
};

const decodeProof = (request: CreateTenantSubscriptionPaymentRequest) => {
  const match = request.proof_data?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Bukti pembayaran tidak valid");
  const mime = match[1] || "";
  const buffer = Buffer.from(match[2] || "", "base64");
  if (!buffer.length || buffer.length > MAX_PROOF_SIZE)
    throw new Error("Ukuran bukti pembayaran maksimal 5 MB");
  const jpeg = mime === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = mime === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const pdf = mime === "application/pdf" && buffer.subarray(0, 4).toString() === "%PDF";
  if (!jpeg && !png && !pdf) throw new Error("Bukti hanya boleh berupa JPEG, PNG, atau PDF");
  return { buffer, extension: jpeg ? "jpg" : png ? "png" : "pdf", mime };
};

export const getPlatformPlansService = async (): Promise<BaseResponse<PlatformPlanInterface[]>> => {
  const result = await pool.query<PlatformPlanInterface>(
    `SELECT plan.id,plan.code,plan.name,plan.billing_period,plan.price::float8 AS price,plan.status,
            COALESCE(json_agg(json_build_object(
              'feature_code',feature.code,'feature_name',feature.name,'value_type',feature.value_type,
              'enabled',entitlement.enabled,'limit_value',entitlement.limit_value
            ) ORDER BY feature.code) FILTER (WHERE feature.id IS NOT NULL),'[]') AS entitlements
     FROM ${tableNames.platformPlan} plan
     LEFT JOIN ${tableNames.platformPlanEntitlement} entitlement ON entitlement.plan_id=plan.id
     LEFT JOIN ${tableNames.platformFeature} feature ON feature.id=entitlement.feature_id AND feature.is_deleted=false
     WHERE plan.is_deleted=false
     GROUP BY plan.id ORDER BY CASE plan.code WHEN 'FREE' THEN 1 WHEN 'EXTRA' THEN 2 ELSE 3 END`,
  );
  return { data: result.rows, message: "Request successful", status: 200 };
};

export const updatePlatformPlanService = async (
  auth: AuthTokenPayload,
  request: UpdatePlatformPlanRequest,
): Promise<BaseResponse<PlatformPlanInterface | null>> => {
  if (!request.plan_id || request.price === null || request.price === undefined || Number(request.price) < 0)
    return { data: null, message: "Plan dan harga wajib diisi", status: 400 };
  const result = await pool.query<PlatformPlanInterface>(
    `UPDATE ${tableNames.platformPlan}
     SET name=COALESCE(NULLIF(trim($2),''),name),
         price=CASE WHEN code='FREE' THEN 0 ELSE $3 END,
         status=CASE WHEN code='FREE' THEN 'ACTIVE' ELSE COALESCE($4,status) END,
         updated_time=now()
     WHERE id=$1 AND is_deleted=false
     RETURNING id,code,name,billing_period,price::float8 AS price,status`,
    [request.plan_id, request.name || null, Number(request.price), request.status || null],
  );
  if (!result.rows[0]) return { data: null, message: "Plan tidak ditemukan", status: 404 };
  await pool.query(
    `INSERT INTO ${tableNames.auditLog} (actor_type,actor_id,action,entity_type,entity_id,metadata)
     VALUES ('PLATFORM',$1,'PLATFORM_PLAN_UPDATE','PLATFORM_PLAN',$2,$3::jsonb)`,
    [auth.user_id, request.plan_id, JSON.stringify({ price: Number(request.price), status: request.status })],
  );
  return { data: result.rows[0], message: "Plan berhasil diperbarui", status: 200 };
};

export const getTenantBillingSummaryService = async (): Promise<BaseResponse<TenantBillingSummaryInterface | null>> => {
  const tenantId = requireCurrentTenantId();
  const result = await pool.query<TenantBillingSummaryInterface>(
    `SELECT subscription.status AS subscription_status,plan.id,plan.code,plan.name,
            plan.billing_period,plan.price::float8 AS price,plan.status,
            next_plan.code AS next_plan_code,
            COALESCE(storage.limit_value,0)::float8 AS storage_limit_bytes,
            COALESCE(usage.total,0)::float8 AS storage_usage_bytes,
            CASE WHEN invoice.id IS NULL THEN NULL ELSE json_build_object(
              'id',invoice.id,'invoice_number',invoice.invoice_number,'plan_code',invoice.plan_code,
              'plan_name',invoice.plan_name,'amount',invoice.amount::float8,'billing_period',invoice.billing_period,
              'status',invoice.status,'due_date',invoice.due_date,'paid_time',invoice.paid_time
            ) END AS invoice
     FROM ${tableNames.tenantSubscription} subscription
     INNER JOIN ${tableNames.platformPlan} plan ON plan.id=subscription.plan_id
     LEFT JOIN ${tableNames.platformPlan} next_plan ON next_plan.id=subscription.next_plan_id
     LEFT JOIN LATERAL (
       SELECT entitlement.limit_value FROM ${tableNames.platformPlanEntitlement} entitlement
       INNER JOIN ${tableNames.platformFeature} feature ON feature.id=entitlement.feature_id
       WHERE entitlement.plan_id=plan.id AND feature.code='STORAGE_LIMIT_BYTES' LIMIT 1
     ) storage ON true
     LEFT JOIN LATERAL (
       SELECT sum(size_bytes) AS total FROM ${tableNames.fileObject}
       WHERE tenant_id=subscription.tenant_id AND status='AVAILABLE' AND is_deleted=false
     ) usage ON true
     LEFT JOIN LATERAL (
       SELECT * FROM ${tableNames.tenantInvoice}
       WHERE tenant_id=subscription.tenant_id AND is_deleted=false ORDER BY billing_period DESC LIMIT 1
     ) invoice ON true
     WHERE subscription.tenant_id=$1 AND subscription.status IN ('ACTIVE','SUSPENDED')
       AND subscription.is_deleted=false LIMIT 1`,
    [tenantId],
  );
  const row = result.rows[0] as TenantBillingSummaryInterface & PlatformPlanInterface;
  if (!row) return { data: null, message: "Subscription tenant tidak ditemukan", status: 404 };
  return {
    data: {
      invoice: row.invoice,
      next_plan_code: row.next_plan_code,
      plan: { billing_period: row.billing_period, code: row.code, id: row.id, name: row.name, price: row.price, status: row.status },
      storage_limit_bytes: row.storage_limit_bytes,
      storage_usage_bytes: row.storage_usage_bytes,
      subscription_status: row.subscription_status,
    },
    message: "Request successful",
    status: 200,
  };
};

export const loadTenantInvoicesService = async (request: BaseRequest): Promise<BaseResponse<TenantInvoiceInterface[]>> => {
  const tenantId = requireCurrentTenantId();
  const { offset, page, pageSize } = paging(request);
  const [rows, count] = await Promise.all([
    pool.query<TenantInvoiceInterface>(
      `SELECT invoice.id,invoice.invoice_number,invoice.plan_code,invoice.plan_name,
              invoice.amount::float8 AS amount,invoice.billing_period,invoice.status,invoice.due_date,invoice.paid_time,
              payment.id AS payment_id,payment.status AS payment_status
       FROM ${tableNames.tenantInvoice} invoice
       LEFT JOIN LATERAL (
         SELECT id,status FROM ${tableNames.tenantSubscriptionPayment}
         WHERE invoice_id=invoice.id AND tenant_id=invoice.tenant_id AND is_deleted=false
         ORDER BY created_time DESC LIMIT 1
       ) payment ON true
       WHERE invoice.tenant_id=$1 AND invoice.is_deleted=false
       ORDER BY invoice.billing_period DESC LIMIT $2 OFFSET $3`, [tenantId, pageSize, offset]),
    pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM ${tableNames.tenantInvoice} WHERE tenant_id=$1 AND is_deleted=false`, [tenantId]),
  ]);
  return { data: rows.rows, message: "Request successful", metaData: { page, pageSize, total: count.rows[0]?.total || 0 }, status: 200 };
};

export const requestTenantPlanChangeService = async (
  request: RequestTenantPlanChangeRequest,
): Promise<BaseResponse<null>> => {
  const tenantId = requireCurrentTenantId();
  const userId = getCurrentAuth()?.user_id;
  if (!request.plan_code) return { data: null, message: "Paket tujuan wajib dipilih", status: 400 };
  const result = await pool.query<{ id: string }>(
    `UPDATE ${tableNames.tenantSubscription} subscription SET
       next_plan_id=plan.id,change_requested_by_id=$3,change_approved_by_id=NULL,
       change_approved_time=NULL,scheduled_plan_change_time=NULL,updated_time=now()
     FROM ${tableNames.platformPlan} plan
     WHERE subscription.tenant_id=$1 AND subscription.status IN ('ACTIVE','SUSPENDED')
       AND subscription.is_deleted=false AND plan.code=$2 AND plan.status='ACTIVE' AND plan.is_deleted=false
       AND plan.id<>subscription.plan_id RETURNING subscription.id`,
    [tenantId, request.plan_code, userId],
  );
  if (!result.rowCount) return { data: null, message: "Paket tujuan tidak tersedia atau sudah aktif", status: 409 };
  await pool.query(
    `INSERT INTO ${tableNames.auditLog} (tenant_id,actor_type,actor_id,action,entity_type,entity_id,metadata)
     VALUES ($1,'TENANT',$2,'SUBSCRIPTION_PLAN_CHANGE_REQUEST','TENANT_SUBSCRIPTION',$3,$4::jsonb)`,
    [tenantId, userId, result.rows[0].id, JSON.stringify({ plan_code: request.plan_code })],
  );
  return { data: null, message: "Perubahan paket menunggu persetujuan Super Admin", status: 200 };
};

export const createTenantSubscriptionPaymentService = async (
  request: CreateTenantSubscriptionPaymentRequest,
): Promise<BaseResponse<null>> => {
  const tenantId = requireCurrentTenantId();
  const userId = getCurrentAuth()?.user_id;
  let storedFile: null | StoredTenantFile = null;
  const client = await pool.connect();
  try {
    if (!request.invoice_id || !request.amount || !request.paid_time)
      return { data: null, message: "Invoice, nominal, tanggal, dan bukti pembayaran wajib diisi", status: 400 };
    const paidTime = new Date(request.paid_time);
    if (Number.isNaN(paidTime.getTime()))
      return { data: null, message: "Tanggal pembayaran tidak valid", status: 400 };
    const proof = decodeProof(request);
    await client.query("BEGIN");
    const invoiceResult = await client.query<{ amount: number; status: string }>(
      `SELECT amount::float8 AS amount,status FROM ${tableNames.tenantInvoice}
       WHERE id=$1 AND tenant_id=$2 AND is_deleted=false FOR UPDATE`,
      [request.invoice_id, tenantId],
    );
    const invoice = invoiceResult.rows[0];
    if (!invoice || !["ISSUED", "OVERDUE"].includes(invoice.status)) {
      await client.query("ROLLBACK");
      return { data: null, message: "Invoice tidak dapat dibayar", status: 409 };
    }
    if (Number(request.amount) !== Number(invoice.amount)) {
      await client.query("ROLLBACK");
      return { data: null, message: "Nominal pembayaran harus sama dengan nilai invoice", status: 400 };
    }
    storedFile = await storeTenantFile(client, {
      body: proof.buffer,
      extension: proof.extension,
      mimeType: proof.mime,
      module: "PLATFORM_SUBSCRIPTION_PAYMENT",
      originalName: request.proof_original_name || `bukti.${proof.extension}`,
    });
    const paymentResult = await client.query<{ id: string }>(
      `INSERT INTO ${tableNames.tenantSubscriptionPayment}
       (tenant_id,invoice_id,proof_file_id,provider_reference,amount,status,paid_time,created_by_id)
       VALUES ($1,$2,$3,$4,$5,'PENDING',$6::timestamptz,$7) RETURNING id`,
      [tenantId, request.invoice_id, storedFile.id, request.provider_reference?.trim() || null, Number(request.amount), paidTime.toISOString(), userId],
    );
    await client.query(
      `INSERT INTO ${tableNames.auditLog} (tenant_id,actor_type,actor_id,action,entity_type,entity_id,metadata)
       VALUES ($1,'TENANT',$2,'SUBSCRIPTION_PAYMENT_SUBMIT','TENANT_SUBSCRIPTION_PAYMENT',$3,$4::jsonb)`,
      [tenantId, userId, paymentResult.rows[0].id, JSON.stringify({ invoice_id: request.invoice_id, amount: Number(request.amount) })],
    );
    await client.query("COMMIT");
    return { data: null, message: "Bukti pembayaran berhasil dikirim", status: 201 };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await discardTenantFile(storedFile).catch(() => undefined);
    logger.error({ err: error }, "Tenant subscription payment submission failed");
    const status = (error as Error & { status?: number }).status || 500;
    return { data: null, message: status === 500 ? "Bukti pembayaran gagal dikirim" : (error as Error).message, status };
  } finally {
    client.release();
  }
};

export const getTenantSubscriptionPaymentProofService = async (paymentId: string) => {
  const tenantId = requireCurrentTenantId();
  const result = await pool.query<{ proof_file_id: string }>(
    `SELECT proof_file_id FROM ${tableNames.tenantSubscriptionPayment}
     WHERE id=$1 AND tenant_id=$2 AND is_deleted=false`, [paymentId, tenantId]);
  return getTenantFile(result.rows[0]?.proof_file_id);
};

export const loadPlatformPaymentReviewsService = async (request: BaseRequest): Promise<BaseResponse<unknown[]>> => {
  const { offset, page, pageSize } = paging(request);
  const status = String((request.params as { status?: string })?.status || "PENDING").toUpperCase();
  const values = status === "ALL" ? [pageSize, offset] : [status, pageSize, offset];
  const filter = status === "ALL" ? "" : "AND payment.status=$1";
  const limitIndex = status === "ALL" ? 1 : 2;
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT payment.id,payment.tenant_id,tenant.code AS tenant_code,tenant.name AS tenant_name,
              payment.invoice_id,invoice.invoice_number,payment.amount::float8 AS amount,payment.status,
              payment.provider_reference,payment.paid_time,payment.created_time,payment.rejection_note
       FROM ${tableNames.tenantSubscriptionPayment} payment
       INNER JOIN ${tableNames.tenant} tenant ON tenant.id=payment.tenant_id
       INNER JOIN ${tableNames.tenantInvoice} invoice ON invoice.id=payment.invoice_id AND invoice.tenant_id=payment.tenant_id
       WHERE payment.is_deleted=false ${filter}
       ORDER BY payment.created_time DESC LIMIT $${limitIndex} OFFSET $${limitIndex + 1}`, values),
    pool.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM ${tableNames.tenantSubscriptionPayment} payment
       WHERE payment.is_deleted=false ${filter}`,
      status === "ALL" ? [] : [status],
    ),
  ]);
  return { data: rows.rows, message: "Request successful", metaData: { page, pageSize, total: count.rows[0]?.total || 0 }, status: 200 };
};

export const loadPlatformSubscriptionsService = async (request: BaseRequest): Promise<BaseResponse<unknown[]>> => {
  const { offset, page, pageSize } = paging(request);
  const pendingOnly = Boolean((request.params as { pending_change_only?: boolean })?.pending_change_only);
  const filter = pendingOnly ? "AND subscription.next_plan_id IS NOT NULL AND subscription.change_approved_time IS NULL" : "";
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT subscription.id,subscription.tenant_id,tenant.code AS tenant_code,tenant.name AS tenant_name,
              tenant.status AS tenant_status,subscription.status,plan.code AS plan_code,plan.name AS plan_name,
              next_plan.code AS next_plan_code,next_plan.name AS next_plan_name,
              subscription.current_period_start,subscription.current_period_end,
              subscription.change_requested_by_id,requester.username AS change_requested_by,
              subscription.change_approved_time,subscription.scheduled_plan_change_time
       FROM ${tableNames.tenantSubscription} subscription
       INNER JOIN ${tableNames.tenant} tenant ON tenant.id=subscription.tenant_id
       INNER JOIN ${tableNames.platformPlan} plan ON plan.id=subscription.plan_id
       LEFT JOIN ${tableNames.platformPlan} next_plan ON next_plan.id=subscription.next_plan_id
       LEFT JOIN ${tableNames.masterUser} requester ON requester.id=subscription.change_requested_by_id
         AND requester.tenant_id=subscription.tenant_id
       WHERE subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false ${filter}
       ORDER BY subscription.updated_time DESC NULLS LAST,subscription.created_time DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    pool.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM ${tableNames.tenantSubscription} subscription
       WHERE subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false ${filter}`,
    ),
  ]);
  return { data: rows.rows, message: "Request successful", metaData: { page, pageSize, total: count.rows[0]?.total || 0 }, status: 200 };
};

const reviewTenantSubscriptionPayment = async (
  auth: AuthTokenPayload,
  request: ReviewTenantSubscriptionPaymentRequest,
  approved: boolean,
): Promise<BaseResponse<null>> => {
  if (!request.payment_id || (!approved && !request.note?.trim()))
    return { data: null, message: approved ? "Payment wajib dipilih" : "Alasan penolakan wajib diisi", status: 400 };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ invoice_id: string; tenant_id: string }>(
      `UPDATE ${tableNames.tenantSubscriptionPayment}
       SET status=$2,rejection_note=$3,reviewed_time=now(),reviewed_by_platform_user_id=$4,updated_time=now()
       WHERE id=$1 AND status='PENDING' AND is_deleted=false
       RETURNING tenant_id,invoice_id`,
      [request.payment_id, approved ? "APPROVED" : "REJECTED", approved ? null : request.note?.trim(), auth.user_id],
    );
    const payment = result.rows[0];
    if (!payment) {
      await client.query("ROLLBACK");
      return { data: null, message: "Payment sudah diproses atau tidak ditemukan", status: 409 };
    }
    if (approved) {
      await client.query(
        `UPDATE ${tableNames.tenantInvoice} SET status='PAID',paid_time=now(),updated_time=now()
         WHERE id=$1 AND tenant_id=$2 AND status IN ('ISSUED','OVERDUE')`,
        [payment.invoice_id, payment.tenant_id],
      );
      await client.query(
        `UPDATE ${tableNames.tenantSubscription} SET status='ACTIVE',updated_time=now()
         WHERE tenant_id=$1 AND status='SUSPENDED' AND is_deleted=false
           AND NOT EXISTS (SELECT 1 FROM ${tableNames.tenantInvoice} invoice
             WHERE invoice.tenant_id=$1 AND invoice.status='OVERDUE' AND invoice.is_deleted=false)`, [payment.tenant_id]);
      await client.query(
        `UPDATE ${tableNames.tenant} SET status='ACTIVE',updated_time=now()
         WHERE id=$1 AND status='SUSPENDED' AND is_deleted=false
           AND EXISTS (SELECT 1 FROM ${tableNames.tenantSubscription} subscription
             WHERE subscription.tenant_id=$1 AND subscription.status='ACTIVE' AND subscription.is_deleted=false)`, [payment.tenant_id]);
    }
    await client.query(
      `INSERT INTO ${tableNames.auditLog} (tenant_id,actor_type,actor_id,action,entity_type,entity_id,metadata)
       VALUES ($1,'PLATFORM',$2,$3,'TENANT_SUBSCRIPTION_PAYMENT',$4,$5::jsonb)`,
      [payment.tenant_id, auth.user_id, approved ? "SUBSCRIPTION_PAYMENT_APPROVE" : "SUBSCRIPTION_PAYMENT_REJECT", request.payment_id, JSON.stringify({ note: request.note || null })],
    );
    await client.query("COMMIT");
    return { data: null, message: approved ? "Pembayaran berhasil disetujui" : "Pembayaran berhasil ditolak", status: 200 };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ err: error }, "Tenant subscription payment review failed");
    return { data: null, message: "Review pembayaran gagal", status: 500 };
  } finally { client.release(); }
};

export const approveTenantSubscriptionPaymentService = (auth: AuthTokenPayload, request: ReviewTenantSubscriptionPaymentRequest) =>
  reviewTenantSubscriptionPayment(auth, request, true);
export const rejectTenantSubscriptionPaymentService = (auth: AuthTokenPayload, request: ReviewTenantSubscriptionPaymentRequest) =>
  reviewTenantSubscriptionPayment(auth, request, false);

export const approveTenantPlanChangeService = async (
  auth: AuthTokenPayload,
  request: ApproveTenantPlanChangeRequest,
): Promise<BaseResponse<null>> => {
  if (!request.subscription_id) return { data: null, message: "Subscription wajib dipilih", status: 400 };
  const result = await pool.query<{ tenant_id: string }>(
    `UPDATE ${tableNames.tenantSubscription}
     SET change_approved_by_id=$2,change_approved_time=now(),
         scheduled_plan_change_time=(date_trunc('month',current_date)+interval '1 month'),updated_time=now()
     WHERE id=$1 AND next_plan_id IS NOT NULL AND change_requested_by_id IS NOT NULL
       AND is_deleted=false RETURNING tenant_id`,
    [request.subscription_id, auth.user_id],
  );
  if (!result.rows[0]) return { data: null, message: "Pengajuan perubahan paket tidak ditemukan", status: 404 };
  await pool.query(
    `INSERT INTO ${tableNames.auditLog} (tenant_id,actor_type,actor_id,action,entity_type,entity_id,metadata)
     VALUES ($1,'PLATFORM',$2,'SUBSCRIPTION_PLAN_CHANGE_APPROVE','TENANT_SUBSCRIPTION',$3,'{}'::jsonb)`,
    [result.rows[0].tenant_id, auth.user_id, request.subscription_id],
  );
  return { data: null, message: "Perubahan paket dijadwalkan untuk periode berikutnya", status: 200 };
};

export const getPlatformSubscriptionPaymentProofService = async (paymentId: string) => {
  const result = await pool.query<{ proof_file_id: string; tenant_id: string }>(
    `SELECT tenant_id,proof_file_id FROM ${tableNames.tenantSubscriptionPayment}
     WHERE id=$1 AND is_deleted=false`, [paymentId]);
  const payment = result.rows[0];
  return payment ? getTenantFileForPlatform(payment.tenant_id, payment.proof_file_id) : null;
};

export const reconcileTenantSubscriptions = async (client?: PoolClient) => {
  const ownedClient = client || await pool.connect();
  try {
    if (!client) await ownedClient.query("BEGIN");
    await ownedClient.query("SELECT pg_advisory_xact_lock(hashtext('homehub:subscription-reconcile'))");
    await ownedClient.query(
      `UPDATE ${tableNames.tenantInvoice} SET status='OVERDUE',updated_time=now()
       WHERE status='ISSUED' AND due_date<current_date AND is_deleted=false`);
    await ownedClient.query(
      `UPDATE ${tableNames.tenantSubscription} subscription SET status='SUSPENDED',updated_time=now()
       WHERE subscription.status='ACTIVE' AND subscription.is_deleted=false AND EXISTS (
         SELECT 1 FROM ${tableNames.tenantInvoice} invoice WHERE invoice.subscription_id=subscription.id
           AND invoice.status='OVERDUE' AND invoice.is_deleted=false)`);
    await ownedClient.query(
      `UPDATE ${tableNames.tenant} tenant SET status='SUSPENDED',updated_time=now()
       WHERE tenant.status='ACTIVE' AND EXISTS (
         SELECT 1 FROM ${tableNames.tenantSubscription} subscription
         WHERE subscription.tenant_id=tenant.id AND subscription.status='SUSPENDED' AND subscription.is_deleted=false)`);
    await ownedClient.query(
      `UPDATE ${tableNames.tenantSubscription} subscription SET
         plan_id=CASE WHEN subscription.next_plan_id IS NOT NULL AND subscription.change_approved_time IS NOT NULL
           AND subscription.scheduled_plan_change_time<=date_trunc('month',current_date) THEN subscription.next_plan_id ELSE subscription.plan_id END,
         next_plan_id=CASE WHEN subscription.next_plan_id IS NOT NULL AND subscription.change_approved_time IS NOT NULL
           AND subscription.scheduled_plan_change_time<=date_trunc('month',current_date) THEN NULL ELSE subscription.next_plan_id END,
         current_period_start=date_trunc('month',current_date)::date,
         current_period_end=(date_trunc('month',current_date)+interval '1 month - 1 day')::date,
         updated_time=now()
       WHERE subscription.current_period_start<date_trunc('month',current_date)::date
         AND subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false`);
    const inserted = await ownedClient.query(
      `INSERT INTO ${tableNames.tenantInvoice}
       (tenant_id,subscription_id,invoice_number,plan_code,plan_name,amount,billing_period,status,issued_date,due_date,paid_time)
       SELECT subscription.tenant_id,subscription.id,
         'HH-'||to_char(current_date,'YYYYMM')||'-'||lpad(nextval('tenant_invoice_number_seq')::text,6,'0'),
         plan.code,plan.name,plan.price,date_trunc('month',current_date)::date,
         CASE WHEN plan.price=0 THEN 'PAID' ELSE 'ISSUED' END,current_date,
         (date_trunc('month',current_date)+interval '6 days')::date,
         CASE WHEN plan.price=0 THEN now() ELSE NULL END
       FROM ${tableNames.tenantSubscription} subscription
       INNER JOIN ${tableNames.platformPlan} plan ON plan.id=subscription.plan_id
       WHERE subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false
       ON CONFLICT (tenant_id,billing_period) DO NOTHING`,
    );
    if (!client) await ownedClient.query("COMMIT");
    return inserted.rowCount || 0;
  } catch (error) {
    if (!client) await ownedClient.query("ROLLBACK");
    throw error;
  } finally { if (!client) ownedClient.release(); }
};
