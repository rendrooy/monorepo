import type {
  AppNotificationInterface,
  BaseRequest,
  IplBillBatchInterface,
  IplBillInterface,
  IplBillPublishResult,
} from "@monorepo/types";
import { pool } from "../connection/db";
import { tableNames } from "../config";
import { getCurrentAuth } from "../utils/request-context";
import { logger } from "../config/logger";
import { addTenantScope, getCurrentTenantId } from "../utils/tenant-scope";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";

const PERIOD_PATTERN = /^(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES)-\d{4}$/;

const paging = (request: BaseRequest) => {
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(request.metadata?.pageSize || 10), 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
};

export const loadBillBatchService = async (request: BaseRequest<IplBillBatchInterface>) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  const { page, pageSize, offset } = paging(request);
  const params = request.params || {};
  const values: unknown[] = [];
  const where = ["b.is_deleted = false", addTenantScope(values, "b.tenant_id")];

  if (params.period) {
    values.push(`%${params.period}%`);
    where.push(`b.period ILIKE $${values.length}`);
  }
  if (params.status) {
    values.push(params.status);
    where.push(`b.status = $${values.length}`);
  }

  const clause = `WHERE ${where.join(" AND ")}`;
  const count = await pool.query(`SELECT COUNT(*) FROM ${tableNames.iplBillBatch} b ${clause}`, values);
  values.push(pageSize, offset);
  const result = await pool.query<IplBillBatchInterface>(
    `SELECT b.*,
       (SELECT COUNT(*)::int FROM ${tableNames.masterFamily} f
        WHERE f.status_dom = 1 AND f.is_active = true AND f.is_deleted = false
          AND f.tenant_id IS NOT DISTINCT FROM b.tenant_id) AS eligible_family_count,
       (SELECT COUNT(*)::int FROM ${tableNames.iplBill} bill
        WHERE bill.batch_id = b.id AND bill.is_deleted = false) AS generated_bill_count
     FROM ${tableNames.iplBillBatch} b ${clause}
     ORDER BY b.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return {
    status: 200,
    message: "Request successful",
    data: result.rows,
    metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize },
  };
};

export const getBillBatchService = async (id?: string | null) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: null };
  const values: unknown[] = [id];
  const tenantScope = addTenantScope(values, "b.tenant_id");
  const result = await pool.query<IplBillBatchInterface>(
    `SELECT b.*,
       (SELECT COUNT(*)::int FROM ${tableNames.masterFamily} f
        WHERE f.status_dom = 1 AND f.is_active = true AND f.is_deleted = false
          AND f.tenant_id IS NOT DISTINCT FROM b.tenant_id) AS eligible_family_count,
       (SELECT COUNT(*)::int FROM ${tableNames.iplBill} bill
        WHERE bill.batch_id = b.id AND bill.is_deleted = false) AS generated_bill_count
     FROM ${tableNames.iplBillBatch} b WHERE b.id = $1 AND b.is_deleted = false AND ${tenantScope}`,
    values,
  );
  return result.rows[0]
    ? { status: 200, message: "Request successful", data: result.rows[0] }
    : { status: 404, message: "Batch tagihan tidak ditemukan", data: null };
};

export const createBillBatchService = async (request: IplBillBatchInterface) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.ADD)))
    return { status: 403, message: "Akses ditolak", data: null };
  const period = request.period?.trim().toUpperCase();
  const amount = Number(request.amount);
  if (!period || !PERIOD_PATTERN.test(period)) {
    return { status: 400, message: "Periode harus menggunakan format MMM-YYYY", data: null };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 400, message: "Nominal tagihan harus lebih besar dari nol", data: null };
  }
  const auth = getCurrentAuth();
  const result = await pool.query<IplBillBatchInterface>(
    `INSERT INTO ${tableNames.iplBillBatch} (tenant_id, period, amount, note, created_by_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [getCurrentTenantId(), period, amount, request.note?.trim() || null, auth?.user_id || null],
  );
  return { status: 201, message: "Draft tagihan berhasil dibuat", data: result.rows[0] };
};

export const updateBillBatchService = async (request: IplBillBatchInterface) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.EDIT)))
    return { status: 403, message: "Akses ditolak", data: null };
  const current = await getBillBatchService(request.id);
  if (!current.data) return current;
  const auth = getCurrentAuth();
  const isDraft = current.data.status === "DRAFT";
  const period = request.period?.trim().toUpperCase();
  const amount = Number(request.amount);
  if (isDraft && (!period || !PERIOD_PATTERN.test(period) || !Number.isFinite(amount) || amount <= 0)) {
    return { status: 400, message: "Periode atau nominal tagihan tidak valid", data: null };
  }
  const values: unknown[] = [request.id, period || current.data.period, isDraft ? amount : current.data.amount, request.note?.trim() || null, auth?.user_id || null];
  const tenantScope = addTenantScope(values);
  const result = await pool.query<IplBillBatchInterface>(
    `UPDATE ${tableNames.iplBillBatch}
     SET period = CASE WHEN status = 'DRAFT' THEN $2 ELSE period END,
         amount = CASE WHEN status = 'DRAFT' THEN $3 ELSE amount END,
         note = $4, updated_time = now(), updated_by_id = $5
     WHERE id = $1 AND status <> 'CANCELLED' AND is_deleted = false AND ${tenantScope} RETURNING *`,
    values,
  );
  return result.rows[0]
    ? { status: 200, message: "Draft tagihan berhasil diperbarui", data: result.rows[0] }
    : { status: 409, message: "Batch tagihan tidak dapat diperbarui", data: null };
};

export const publishBillBatchService = async (id?: string | null) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.ACTION)))
    return { status: 403, message: "Akses ditolak", data: null };
  const client = await pool.connect();
  const tenantId = getCurrentTenantId();
  try {
    await client.query("BEGIN");
    const batchResult = await client.query<IplBillBatchInterface>(
      `SELECT * FROM ${tableNames.iplBillBatch}
       WHERE id = $1 AND status = 'DRAFT' AND is_deleted = false
         AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
      [id, tenantId],
    );
    const batch = batchResult.rows[0];
    if (!batch) {
      await client.query("ROLLBACK");
      return { status: 409, message: "Hanya draft yang dapat diterbitkan", data: null };
    }

    const families = await client.query<{ id: string }>(
      `SELECT f.id FROM ${tableNames.masterFamily} f
       WHERE f.status_dom = 1 AND f.is_active = true AND f.is_deleted = false
         AND f.tenant_id IS NOT DISTINCT FROM $1::uuid
       ORDER BY f.created_time ASC`,
      [tenantId],
    );
    let generated = 0;
    for (const family of families.rows) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ${tableNames.iplBill}
           (tenant_id, batch_id, family_id, bill_number, period, amount, note, created_by_id)
         SELECT $7, $1, $2,
           'IPL-' || $3 || '-' || LPAD(nextval('ipl_bill_number_seq')::text, 6, '0'),
           $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM ${tableNames.iplBill}
           WHERE family_id = $2 AND period = $3 AND status <> 'CANCELLED' AND is_deleted = false
             AND tenant_id IS NOT DISTINCT FROM $7::uuid
         ) RETURNING id`,
        [batch.id, family.id, batch.period, batch.amount, batch.note, getCurrentAuth()?.user_id || null, tenantId],
      );
      const bill = inserted.rows[0];
      if (!bill) continue;
      generated += 1;
      const creditResult = await client.query<{ balance: string }>(
        `SELECT balance FROM ${tableNames.iplFamilyCredit}
         WHERE family_id = $1 AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
        [family.id, tenantId],
      );
      const currentCredit = Number(creditResult.rows[0]?.balance || 0);
      const allocatedCredit = Math.min(currentCredit, Number(batch.amount || 0));
      if (allocatedCredit > 0) {
        const balanceResult = await client.query<{ balance: string }>(
          `UPDATE ${tableNames.iplFamilyCredit}
           SET balance = balance - $2, updated_time = now(), updated_by_id = $3
           WHERE family_id = $1 AND tenant_id IS NOT DISTINCT FROM $4::uuid RETURNING balance`,
          [family.id, allocatedCredit, getCurrentAuth()?.user_id || null, tenantId],
        );
        await client.query(
          `UPDATE ${tableNames.iplBill}
           SET paid_amount = $2, status = CASE WHEN $2 >= amount THEN 'PAID' ELSE 'PARTIALLY_PAID' END,
               updated_time = now(), updated_by_id = $3
           WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
          [bill.id, allocatedCredit, getCurrentAuth()?.user_id || null, tenantId],
        );
        await client.query(
          `INSERT INTO ${tableNames.iplCreditLedger}
           (tenant_id, family_id, bill_id, transaction_type, amount, balance_after, note, created_by_id)
           VALUES ($6::uuid, $1::uuid, $2::uuid, 'ALLOCATED', ($3::numeric * -1), $4::numeric, 'Alokasi otomatis ke tagihan baru', $5::uuid)`,
          [family.id, bill.id, allocatedCredit, Number(balanceResult.rows[0]?.balance || 0), getCurrentAuth()?.user_id || null, tenantId],
        );
      }
      await client.query(
        `INSERT INTO ${tableNames.notification}
           (tenant_id, user_id, type, title, message, reference_id, reference_url, created_by_id)
         SELECT DISTINCT $5::uuid, u.id, 'IPL_BILL_PUBLISHED', 'Tagihan IPL baru',
           'Tagihan IPL periode ' || $2 || ' telah diterbitkan.', $1::uuid, '/operation/bill', $3::uuid
         FROM ${tableNames.masterUser} u
         INNER JOIN ${tableNames.masterMember} m ON u.member_id = m.id
         WHERE m.family_id = $4::uuid AND u.is_active = true AND u.is_deleted = false
           AND u.tenant_id IS NOT DISTINCT FROM $5::uuid
           AND m.tenant_id IS NOT DISTINCT FROM $5::uuid`,
        [bill.id, batch.period, getCurrentAuth()?.user_id || null, family.id, tenantId],
      );
    }

    await client.query(
      `UPDATE ${tableNames.iplBillBatch}
       SET status = 'PUBLISHED', published_time = now(), published_by_id = $2,
           updated_time = now(), updated_by_id = $2
       WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
      [batch.id, getCurrentAuth()?.user_id || null, tenantId],
    );
    await client.query("COMMIT");
    const data: IplBillPublishResult = {
      eligible: families.rowCount || 0,
      generated,
      skipped: (families.rowCount || 0) - generated,
    };
    return { status: 200, message: "Tagihan berhasil diterbitkan", data };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ err: error, batchId: id }, "Bill batch publication failed");
    return { status: 500, message: "Gagal menerbitkan tagihan", data: null };
  } finally {
    client.release();
  }
};

export const cancelBillBatchService = async (id?: string | null) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.ACTION)))
    return { status: 403, message: "Akses ditolak", data: null };
  const client = await pool.connect();
  const tenantId = getCurrentTenantId();
  try {
    await client.query("BEGIN");
    const approvedPayments = await client.query(
      `SELECT 1 FROM ${tableNames.iplPayment} payment
       INNER JOIN ${tableNames.iplBill} bill ON bill.id = payment.bill_id
       WHERE bill.batch_id = $1 AND payment.status = 'APPROVED' AND payment.is_deleted = false
         AND bill.tenant_id IS NOT DISTINCT FROM $2::uuid
         AND payment.tenant_id IS NOT DISTINCT FROM $2::uuid LIMIT 1`,
      [id, tenantId],
    );
    if (approvedPayments.rowCount) {
      await client.query("ROLLBACK");
      return { status: 409, message: "Batch dengan pembayaran approved tidak dapat dibatalkan", data: null };
    }
    const updated = await client.query(
      `UPDATE ${tableNames.iplBillBatch} SET status = 'CANCELLED', updated_time = now(), updated_by_id = $2
       WHERE id = $1 AND status <> 'CANCELLED' AND is_deleted = false
         AND tenant_id IS NOT DISTINCT FROM $3::uuid RETURNING id`,
      [id, getCurrentAuth()?.user_id || null, tenantId],
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return { status: 409, message: "Batch tagihan tidak dapat dibatalkan", data: null };
    }
    const allocations = await client.query<{ id: string; family_id: string; bill_id: string; amount: string }>(
      `SELECT ledger.id, ledger.family_id, ledger.bill_id, ledger.amount
       FROM ${tableNames.iplCreditLedger} ledger
       INNER JOIN ${tableNames.iplBill} bill ON bill.id = ledger.bill_id
       WHERE bill.batch_id = $1 AND ledger.transaction_type = 'ALLOCATED'
         AND bill.tenant_id IS NOT DISTINCT FROM $2::uuid
         AND ledger.tenant_id IS NOT DISTINCT FROM $2::uuid
         AND NOT EXISTS (SELECT 1 FROM ${tableNames.iplCreditLedger} reversal WHERE reversal.related_ledger_id = ledger.id)`,
      [id, tenantId],
    );
    for (const allocation of allocations.rows) {
      const restoredAmount = Math.abs(Number(allocation.amount));
      const balance = await client.query<{ balance: string }>(
        `INSERT INTO ${tableNames.iplFamilyCredit} (tenant_id, family_id, balance, created_by_id)
         VALUES ($4, $1, $2, $3)
         ON CONFLICT (family_id) DO UPDATE SET balance = ${tableNames.iplFamilyCredit}.balance + EXCLUDED.balance,
           updated_time = now(), updated_by_id = EXCLUDED.created_by_id RETURNING balance`,
        [allocation.family_id, restoredAmount, getCurrentAuth()?.user_id || null, tenantId],
      );
      await client.query(
        `INSERT INTO ${tableNames.iplCreditLedger}
         (tenant_id, family_id, bill_id, related_ledger_id, transaction_type, amount, balance_after, note, created_by_id)
         VALUES ($7, $1, $2, $3, 'ALLOCATION_REVERSED', $4, $5, 'Pengembalian karena batch dibatalkan', $6)`,
        [allocation.family_id, allocation.bill_id, allocation.id, restoredAmount, Number(balance.rows[0]?.balance || 0), getCurrentAuth()?.user_id || null, tenantId],
      );
    }
    await client.query(
      `UPDATE ${tableNames.iplBill} SET status = 'CANCELLED', updated_time = now(), updated_by_id = $2
       WHERE batch_id = $1 AND status <> 'CANCELLED' AND is_deleted = false
         AND tenant_id IS NOT DISTINCT FROM $3::uuid`,
      [id, getCurrentAuth()?.user_id || null, tenantId],
    );
    await client.query("COMMIT");
    return { status: 200, message: "Batch tagihan berhasil dibatalkan", data: null };
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ err: error, batchId: id }, "Bill batch cancellation failed");
    return { status: 500, message: "Gagal membatalkan tagihan", data: null };
  } finally {
    client.release();
  }
};

const loadBills = async (request: BaseRequest<IplBillInterface>, familyId?: string | null) => {
  const { page, pageSize, offset } = paging(request);
  const params = request.params || {};
  const values: unknown[] = [];
  const where = ["bill.is_deleted = false", addTenantScope(values, "bill.tenant_id")];
  if (familyId) { values.push(familyId); where.push(`bill.family_id = $${values.length}`); }
  if (params.period) { values.push(`%${params.period}%`); where.push(`bill.period ILIKE $${values.length}`); }
  if (params.status) { values.push(params.status); where.push(`bill.status = $${values.length}`); }
  if (params.family_no_kk) { values.push(`%${params.family_no_kk}%`); where.push(`f.no_kk ILIKE $${values.length}`); }
  const clause = `WHERE ${where.join(" AND ")}`;
  const count = await pool.query(
    `SELECT COUNT(*) FROM ${tableNames.iplBill} bill INNER JOIN ${tableNames.masterFamily} f ON f.id = bill.family_id ${clause}`,
    values,
  );
  values.push(pageSize, offset);
  const data = await pool.query<IplBillInterface>(
    `SELECT bill.*, f.no_kk AS family_no_kk, f.address AS family_address,
       GREATEST(bill.amount - bill.paid_amount, 0) AS remaining_amount,
       COALESCE((SELECT SUM(-ledger.amount) FROM ${tableNames.iplCreditLedger} ledger
        WHERE ledger.bill_id = bill.id AND ledger.transaction_type = 'ALLOCATED'
          AND NOT EXISTS (SELECT 1 FROM ${tableNames.iplCreditLedger} reversal WHERE reversal.related_ledger_id = ledger.id)), 0) AS credit_applied_amount,
       (SELECT COUNT(*)::int FROM ${tableNames.iplPayment} p
        WHERE p.bill_id = bill.id AND p.status = 'PENDING' AND p.is_deleted = false) AS pending_payment_count
     FROM ${tableNames.iplBill} bill INNER JOIN ${tableNames.masterFamily} f ON f.id = bill.family_id
     ${clause} ORDER BY bill.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { status: 200, message: "Request successful", data: data.rows, metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize } };
};

export const loadBillService = async (request: BaseRequest<IplBillInterface>) => {
  if (!(await hasMenuPermission("OP_IPL", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  return loadBills(request);
};

export const loadMyBillService = async (request: BaseRequest<IplBillInterface>) => {
  if (!(await hasMenuPermission("OP_BILL", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  const auth = getCurrentAuth();
  const values: unknown[] = [auth?.user_id];
  const userTenantScope = addTenantScope(values, "u.tenant_id");
  const family = await pool.query<{ family_id: string | null }>(
    `SELECT m.family_id FROM ${tableNames.masterUser} u
     LEFT JOIN ${tableNames.masterMember} m ON m.id = u.member_id
     WHERE u.id = $1 AND ${userTenantScope}`,
    values,
  );
  const familyId = family.rows[0]?.family_id;
  if (!familyId) return { status: 200, message: "Akun belum terhubung dengan keluarga", data: [], metaData: { total: 0, page: 1, pageSize: 10 } };
  return loadBills(request, familyId);
};

export const loadNotificationService = async () => {
  const values: unknown[] = [getCurrentAuth()?.user_id];
  const tenantScope = addTenantScope(values);
  const result = await pool.query<AppNotificationInterface>(
    `SELECT * FROM ${tableNames.notification}
     WHERE user_id = $1 AND is_deleted = false AND ${tenantScope}
     ORDER BY created_time DESC LIMIT 20`,
    values,
  );
  return { status: 200, message: "Request successful", data: result.rows };
};

export const readNotificationService = async (id?: string | null) => {
  const values: unknown[] = [id, getCurrentAuth()?.user_id];
  const tenantScope = addTenantScope(values);
  const result = await pool.query(
    `UPDATE ${tableNames.notification} SET is_read = true, read_time = now()
     WHERE id = $1 AND user_id = $2 AND is_deleted = false AND ${tenantScope} RETURNING id`,
    values,
  );
  return result.rowCount
    ? { status: 200, message: "Notifikasi sudah dibaca", data: null }
    : { status: 404, message: "Notifikasi tidak ditemukan", data: null };
};
