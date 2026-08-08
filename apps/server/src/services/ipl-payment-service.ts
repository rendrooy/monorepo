import type { BaseRequest, IplPaymentInterface } from "@monorepo/types";
import type { PoolClient } from "pg";
import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { addTenantScope, getCurrentTenantId } from "../utils/tenant-scope";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";
import { postIncomeTransaction, reverseIncomeTransaction } from "./financial-transaction-service";
import { discardTenantFile, getTenantFile, storeTenantFile } from "./file-object-service";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const canManagePayments = () =>
  hasMenuPermission("IPL_PAYMENT_VERIFY", PERMISSION.ACTION);

const paging = (request: BaseRequest) => {
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(
    Math.max(Number(request.metadata?.pageSize || 10), 1),
    100,
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const getUserFamilyId = async (
  client: PoolClient | typeof pool,
  userId?: string | null,
) => {
  const result = await client.query<{ family_id: string | null }>(
    `SELECT m.family_id FROM ${tableNames.masterUser} u
     LEFT JOIN ${tableNames.masterMember} m ON m.id = u.member_id
     WHERE u.id = $1 AND u.tenant_id IS NOT DISTINCT FROM $2::uuid`,
    [userId, getCurrentTenantId()],
  );
  return result.rows[0]?.family_id || null;
};

const decodeProof = (request: IplPaymentInterface) => {
  const match = request.proof_data?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Bukti pembayaran tidak valid");
  const mime = match[1] || "";
  const buffer = Buffer.from(match[2] || "", "base64");
  if (!buffer.length || buffer.length > MAX_FILE_SIZE)
    throw new Error("Ukuran bukti pembayaran maksimal 5 MB");

  const isJpeg =
    mime === "image/jpeg" &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isPng =
    mime === "image/png" &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isPdf =
    mime === "application/pdf" && buffer.subarray(0, 4).toString() === "%PDF";
  if (!isJpeg && !isPng && !isPdf)
    throw new Error("Bukti hanya boleh berupa JPEG, PNG, atau PDF");
  return { buffer, mime, extension: isJpeg ? "jpg" : isPng ? "png" : "pdf" };
};

const saveProof = async (client: PoolClient, request: IplPaymentInterface) => {
  const proof = decodeProof(request);
  return storeTenantFile(client, {
    module: "IPL_PAYMENT",
    originalName: request.proof_original_name || `bukti.${proof.extension}`,
    mimeType: proof.mime,
    extension: proof.extension,
    body: proof.buffer,
  });
};

const notifyFamily = async (
  client: PoolClient,
  familyId: string,
  type: string,
  title: string,
  message: string,
  referenceId: string,
) => {
  await client.query(
    `INSERT INTO ${tableNames.notification}
       (tenant_id, user_id, type, title, message, reference_id, reference_url, created_by_id)
     SELECT DISTINCT $7::uuid, u.id, $2, $3, $4, $5::uuid, '/operation/bill', $6::uuid
     FROM ${tableNames.masterUser} u
     INNER JOIN ${tableNames.masterMember} m ON m.id = u.member_id
     WHERE m.family_id = $1::uuid AND u.is_active = true AND u.is_deleted = false
       AND u.tenant_id IS NOT DISTINCT FROM $7::uuid
       AND m.tenant_id IS NOT DISTINCT FROM $7::uuid`,
    [
      familyId,
      type,
      title,
      message,
      referenceId,
      getCurrentAuth()?.user_id || null,
      getCurrentTenantId(),
    ],
  );
};

const notifyAdmins = async (
  client: PoolClient,
  paymentId: string,
  billNumber: string,
) => {
  await client.query(
    `INSERT INTO ${tableNames.notification}
       (tenant_id, user_id, type, title, message, reference_id, reference_url, created_by_id)
     SELECT $4::uuid, u.id, 'IPL_PAYMENT_SUBMITTED', 'Pembayaran menunggu verifikasi',
       'Bukti pembayaran untuk ' || $2 || ' telah diajukan.', $1::uuid,
       '/ipl/verifikasi-payment', $3::uuid
     FROM ${tableNames.masterUser} u INNER JOIN ${tableNames.masterRole} r ON r.id = u.role_id
     WHERE r.code = 'ADMIN' AND u.is_active = true AND u.is_deleted = false
       AND u.tenant_id IS NOT DISTINCT FROM $4::uuid`,
    [paymentId, billNumber, getCurrentAuth()?.user_id || null, getCurrentTenantId()],
  );
};

const applyApprovedPayment = async (client: PoolClient, paymentId: string) => {
  const paymentResult = await client.query<IplPaymentInterface>(
    `SELECT * FROM ${tableNames.iplPayment}
     WHERE id = $1 AND is_deleted = false
       AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
    [paymentId, getCurrentTenantId()],
  );
  const payment = paymentResult.rows[0];
  if (!payment?.bill_id || !payment.family_id)
    throw new Error("Pembayaran tidak ditemukan");
  const billResult = await client.query<{
    id: string;
    amount: string;
    paid_amount: string;
    credit_amount: string;
    status: string;
    bill_number: string;
  }>(
    `SELECT * FROM ${tableNames.iplBill}
     WHERE id = $1 AND status <> 'CANCELLED' AND is_deleted = false
       AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
    [payment.bill_id, getCurrentTenantId()],
  );
  const bill = billResult.rows[0];
  if (!bill) throw new Error("Tagihan tidak aktif");
  const amount = Number(payment.amount || 0);
  const paid = Number(bill.paid_amount || 0);
  const remaining = Math.max(Number(bill.amount) - paid, 0);
  const allocated = Math.min(amount, remaining);
  const credit = amount - allocated;
  const nextPaid = paid + allocated;
  const nextCredit = Number(bill.credit_amount || 0) + credit;
  const nextStatus =
    nextCredit > 0
      ? "OVERPAID"
      : nextPaid >= Number(bill.amount)
        ? "PAID"
        : nextPaid > 0
          ? "PARTIALLY_PAID"
          : "UNPAID";

  await client.query(
    `UPDATE ${tableNames.iplPayment}
     SET status = 'APPROVED', allocated_amount = $2, credit_amount = $3,
         approved_time = now(), approved_by_id = $4, updated_time = now(), updated_by_id = $4
     WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $5::uuid`,
    [paymentId, allocated, credit, getCurrentAuth()?.user_id || null, getCurrentTenantId()],
  );
  await client.query(
    `UPDATE ${tableNames.iplBill} SET paid_amount = $2, credit_amount = $3, status = $4,
       updated_time = now(), updated_by_id = $5
     WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $6::uuid`,
    [
      bill.id,
      nextPaid,
      nextCredit,
      nextStatus,
      getCurrentAuth()?.user_id || null,
      getCurrentTenantId(),
    ],
  );
  await postIncomeTransaction(client, {
    transactionType: "IPL",
    amount,
    transactionDate: payment.payment_date!,
    referenceType: "IPL_PAYMENT",
    referenceId: paymentId,
    familyId: payment.family_id,
    description: `Pembayaran IPL ${bill.bill_number}`,
  });
  if (credit > 0) {
    const creditBalance = await client.query<{ balance: string }>(
      `INSERT INTO ${tableNames.iplFamilyCredit} (tenant_id, family_id, balance, created_by_id)
       VALUES ($4, $1, $2, $3)
       ON CONFLICT (family_id) DO UPDATE SET balance = ${tableNames.iplFamilyCredit}.balance + EXCLUDED.balance,
         updated_time = now(), updated_by_id = EXCLUDED.created_by_id
       RETURNING balance`,
      [payment.family_id, credit, getCurrentAuth()?.user_id || null, getCurrentTenantId()],
    );
    await client.query(
      `INSERT INTO ${tableNames.iplCreditLedger}
       (tenant_id, family_id, bill_id, payment_id, transaction_type, amount, balance_after, note, created_by_id)
       VALUES ($7, $1, $2, $3, 'EARNED', $4, $5, 'Kelebihan pembayaran', $6)`,
      [
        payment.family_id,
        payment.bill_id,
        paymentId,
        credit,
        Number(creditBalance.rows[0]?.balance || 0),
        getCurrentAuth()?.user_id || null,
        getCurrentTenantId(),
      ],
    );
  }
  return { payment, billNumber: bill.bill_number, allocated, credit };
};

export const createPaymentService = async (request: IplPaymentInterface) => {
  const auth = getCurrentAuth();
  const admin = await canManagePayments();
  if (!admin && !(await hasMenuPermission("OP_BILL", PERMISSION.ACTION)))
    return { status: 403, message: "Akses ditolak", data: null };
  const amount = Number(request.amount);
  if (
    !request.bill_id ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !request.payment_date ||
    !request.payment_method
  ) {
    return {
      status: 400,
      message: "Data pembayaran belum lengkap",
      data: null,
    };
  }
  let saved: Awaited<ReturnType<typeof saveProof>> | null = null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '20s'");
    saved = await saveProof(client, request);
    const billResult = await client.query<{
      id: string;
      family_id: string;
      bill_number: string;
      status: string;
      amount: string;
      paid_amount: string;
    }>(
      `SELECT id, family_id, bill_number, status, amount, paid_amount FROM ${tableNames.iplBill}
       WHERE id = $1 AND status NOT IN ('CANCELLED', 'PAID', 'OVERPAID') AND is_deleted = false
         AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
      [request.bill_id, getCurrentTenantId()],
    );
    const bill = billResult.rows[0];
    if (!bill) throw new Error("Tagihan tidak tersedia untuk pembayaran");
    if (!admin) {
      const familyId = await getUserFamilyId(client, auth?.user_id);
      if (!familyId || familyId !== bill.family_id)
        throw new Error("Anda tidak memiliki akses ke tagihan ini");
    } else if (request.family_id && request.family_id !== bill.family_id) {
      throw new Error("Keluarga tidak sesuai dengan tagihan");
    }

    const status = admin ? "APPROVED" : "PENDING";
    const inserted = await client.query<IplPaymentInterface>(
      `INSERT INTO ${tableNames.iplPayment}
       (tenant_id, bill_id, family_id, amount, payment_date, payment_method, reference_number, note,
        proof_file_id, proof_path, proof_original_name, proof_mime_type, proof_size,
        status, submitted_by_role, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        getCurrentTenantId(),
        bill.id,
        bill.family_id,
        amount,
        request.payment_date,
        request.payment_method,
        request.reference_number?.trim() || null,
        request.note?.trim() || null,
        saved.id,
        saved.objectKey,
        saved.originalName,
        saved.mimeType,
        saved.size,
        status,
        admin ? "ADMIN" : "WARGA",
        auth?.user_id || null,
      ],
    );
    const payment = inserted.rows[0]!;
    if (admin) {
      await applyApprovedPayment(client, payment.id!);
      await notifyFamily(
        client,
        bill.family_id,
        "IPL_PAYMENT_APPROVED",
        "Pembayaran IPL tercatat",
        `Pembayaran ${bill.bill_number} telah dicatat oleh admin.`,
        payment.id!,
      );
    } else {
      await notifyAdmins(client, payment.id!, bill.bill_number);
    }
    await client.query("COMMIT");
    return {
      status: 201,
      message: admin
        ? "Pembayaran berhasil dicatat"
        : "Bukti pembayaran berhasil diajukan",
      data: payment,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    await discardTenantFile(saved).catch(() => undefined);
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan pembayaran";
    return { status: 400, message, data: null };
  } finally {
    client.release();
  }
};

const loadPayments = async (
  request: BaseRequest<IplPaymentInterface>,
  familyId?: string | null,
) => {
  const { page, pageSize, offset } = paging(request);
  const params = request.params || {};
  const values: unknown[] = [];
  const where = ["p.is_deleted = false", addTenantScope(values, "p.tenant_id")];
  if (familyId) {
    values.push(familyId);
    where.push(`p.family_id = $${values.length}`);
  }
  if (params.status) {
    values.push(params.status);
    where.push(`p.status = $${values.length}`);
  }
  if (params.payment_method) {
    values.push(params.payment_method);
    where.push(`p.payment_method = $${values.length}`);
  }
  if (params.period) {
    values.push(`%${params.period}%`);
    where.push(`bill.period ILIKE $${values.length}`);
  }
  if (params.family_no_kk) {
    values.push(`%${params.family_no_kk}%`);
    where.push(`f.no_kk ILIKE $${values.length}`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;
  const joins = `INNER JOIN ${tableNames.iplBill} bill ON bill.id = p.bill_id INNER JOIN ${tableNames.masterFamily} f ON f.id = p.family_id`;
  const count = await pool.query(
    `SELECT COUNT(*) FROM ${tableNames.iplPayment} p ${joins} ${clause}`,
    values,
  );
  values.push(pageSize, offset);
  const data = await pool.query<IplPaymentInterface>(
    `SELECT p.*, bill.bill_number, bill.period, f.no_kk AS family_no_kk, f.address AS family_address
     FROM ${tableNames.iplPayment} p ${joins} ${clause}
     ORDER BY p.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return {
    status: 200,
    message: "Request successful",
    data: data.rows,
    metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize },
  };
};

export const loadPaymentService = async (
  request: BaseRequest<IplPaymentInterface>,
) => {
  if (!(await hasMenuPermission("IPL_PAYMENT_VERIFY", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  return loadPayments(request);
};

export const loadMyPaymentService = async (
  request: BaseRequest<IplPaymentInterface>,
) => {
  if (!(await hasMenuPermission("OP_BILL", PERMISSION.READ)))
    return { status: 403, message: "Akses ditolak", data: [] };
  const familyId = await getUserFamilyId(pool, getCurrentAuth()?.user_id);
  return familyId
    ? loadPayments(request, familyId)
    : {
      status: 200,
      message: "Akun belum terhubung dengan keluarga",
      data: [],
      metaData: { total: 0, page: 1, pageSize: 10 },
    };
};

export const approvePaymentService = async (id?: string | null) => {
  if (!(await canManagePayments()))
    return { status: 403, message: "Akses ditolak", data: null };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const check = await client.query<IplPaymentInterface>(
      `SELECT * FROM ${tableNames.iplPayment}
       WHERE id = $1 AND status = 'PENDING'
         AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
      [id, getCurrentTenantId()],
    );
    if (!check.rows[0]) throw new Error("Pembayaran tidak dapat disetujui");
    const applied = await applyApprovedPayment(client, id!);
    await notifyFamily(
      client,
      applied.payment.family_id!,
      "IPL_PAYMENT_APPROVED",
      "Pembayaran disetujui",
      `Pembayaran ${applied.billNumber} telah disetujui.`,
      id!,
    );
    await client.query("COMMIT");
    return {
      status: 200,
      message: "Pembayaran berhasil disetujui",
      data: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message:
        error instanceof Error ? error.message : "Gagal menyetujui pembayaran",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const rejectPaymentService = async (
  id?: string | null,
  note?: string | null,
) => {
  if (!(await canManagePayments()))
    return { status: 403, message: "Akses ditolak", data: null };
  if (!note?.trim())
    return { status: 400, message: "Alasan penolakan wajib diisi", data: null };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<IplPaymentInterface>(
      `UPDATE ${tableNames.iplPayment} SET status = 'REJECTED', rejection_note = $2,
       rejected_time = now(), rejected_by_id = $3, updated_time = now(), updated_by_id = $3
       WHERE id = $1 AND status = 'PENDING'
         AND tenant_id IS NOT DISTINCT FROM $4::uuid RETURNING *`,
      [id, note.trim(), getCurrentAuth()?.user_id || null, getCurrentTenantId()],
    );
    const payment = result.rows[0];
    if (!payment?.family_id) throw new Error("Pembayaran tidak dapat ditolak");
    await notifyFamily(
      client,
      payment.family_id,
      "IPL_PAYMENT_REJECTED",
      "Pembayaran ditolak",
      `Bukti pembayaran ditolak: ${note.trim()}`,
      payment.id!,
    );
    await client.query("COMMIT");
    return { status: 200, message: "Pembayaran berhasil ditolak", data: null };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message:
        error instanceof Error ? error.message : "Gagal menolak pembayaran",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const reversePaymentService = async (
  id?: string | null,
  note?: string | null,
) => {
  if (!(await canManagePayments()))
    return { status: 403, message: "Akses ditolak", data: null };
  if (!note?.trim())
    return { status: 400, message: "Alasan reversal wajib diisi", data: null };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paymentResult = await client.query<IplPaymentInterface>(
      `SELECT * FROM ${tableNames.iplPayment}
       WHERE id = $1 AND status = 'APPROVED'
         AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
      [id, getCurrentTenantId()],
    );
    const payment = paymentResult.rows[0];
    if (!payment?.bill_id || !payment.family_id)
      throw new Error("Pembayaran tidak dapat dibatalkan");
    const billResult = await client.query<{
      amount: string;
      paid_amount: string;
      credit_amount: string;
    }>(
      `SELECT amount, paid_amount, credit_amount FROM ${tableNames.iplBill}
       WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
      [payment.bill_id, getCurrentTenantId()],
    );
    const bill = billResult.rows[0];
    if (!bill) throw new Error("Tagihan tidak ditemukan");
    const nextPaid = Math.max(
      Number(bill.paid_amount) - Number(payment.allocated_amount || 0),
      0,
    );
    const nextCredit = Math.max(
      Number(bill.credit_amount) - Number(payment.credit_amount || 0),
      0,
    );
    const nextStatus =
      nextCredit > 0
        ? "OVERPAID"
        : nextPaid >= Number(bill.amount)
          ? "PAID"
          : nextPaid > 0
            ? "PARTIALLY_PAID"
            : "UNPAID";
    if (Number(payment.credit_amount || 0) > 0) {
      const credit = await client.query<{ balance: string }>(
        `SELECT balance FROM ${tableNames.iplFamilyCredit}
         WHERE family_id = $1 AND tenant_id IS NOT DISTINCT FROM $2::uuid FOR UPDATE`,
        [payment.family_id, getCurrentTenantId()],
      );
      if (Number(credit.rows[0]?.balance || 0) < Number(payment.credit_amount))
        throw new Error(
          "Saldo kredit sudah digunakan dan tidak dapat direversal",
        );
      const nextBalance = await client.query<{ balance: string }>(
        `UPDATE ${tableNames.iplFamilyCredit}
         SET balance = balance - $2, updated_time = now(), updated_by_id = $3
         WHERE family_id = $1 AND tenant_id IS NOT DISTINCT FROM $4::uuid RETURNING balance`,
        [
          payment.family_id,
          payment.credit_amount,
          getCurrentAuth()?.user_id || null,
          getCurrentTenantId(),
        ],
      );
      await client.query(
        `INSERT INTO ${tableNames.iplCreditLedger}
         (tenant_id, family_id, bill_id, payment_id, related_ledger_id, transaction_type, amount, balance_after, note, created_by_id)
         SELECT $8::uuid, $1::uuid, $2::uuid, $3::uuid, ledger.id, 'EARNED_REVERSED', ($4::numeric * -1), $5::numeric, $6, $7::uuid
         FROM ${tableNames.iplCreditLedger} ledger
         WHERE ledger.payment_id = $3 AND ledger.transaction_type = 'EARNED'
           AND ledger.tenant_id IS NOT DISTINCT FROM $8::uuid
         ORDER BY ledger.created_time DESC LIMIT 1`,
        [
          payment.family_id,
          payment.bill_id,
          payment.id,
          payment.credit_amount,
          Number(nextBalance.rows[0]?.balance || 0),
          note.trim(),
          getCurrentAuth()?.user_id || null,
          getCurrentTenantId(),
        ],
      );
    }
    await client.query(
      `UPDATE ${tableNames.iplBill}
       SET paid_amount = $2, credit_amount = $3, status = $4, updated_time = now(), updated_by_id = $5
       WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $6::uuid`,
      [
        payment.bill_id,
        nextPaid,
        nextCredit,
        nextStatus,
        getCurrentAuth()?.user_id || null,
        getCurrentTenantId(),
      ],
    );
    await client.query(
      `UPDATE ${tableNames.iplPayment}
       SET status = 'REVERSED', reversal_note = $2, reversed_time = now(), reversed_by_id = $3, updated_time = now(), updated_by_id = $3
       WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $4::uuid`,
      [id, note.trim(), getCurrentAuth()?.user_id || null, getCurrentTenantId()],
    );
    await reverseIncomeTransaction(client, "IPL_PAYMENT", payment.id!, note.trim());
    await notifyFamily(
      client,
      payment.family_id,
      "IPL_PAYMENT_REVERSED",
      "Pembayaran dibatalkan",
      `Pembayaran dibatalkan oleh admin: ${note.trim()}`,
      payment.id!,
    );
    await client.query("COMMIT");
    return {
      status: 200,
      message: "Pembayaran berhasil direversal",
      data: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message:
        error instanceof Error ? error.message : "Gagal melakukan reversal",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const getPaymentProofService = async (id?: string | null) => {
  const values: unknown[] = [id];
  const tenantScope = addTenantScope(values);
  const result = await pool.query<IplPaymentInterface & { proof_file_id?: string | null }>(
    `SELECT * FROM ${tableNames.iplPayment}
     WHERE id = $1 AND is_deleted = false AND ${tenantScope}`,
    values,
  );
  const payment = result.rows[0];
  if (!payment) return null;
  if (!(await hasMenuPermission("IPL_PAYMENT_VERIFY", PERMISSION.READ))) {
    if (!(await hasMenuPermission("OP_BILL", PERMISSION.READ))) return null;
    const familyId = await getUserFamilyId(pool, getCurrentAuth()?.user_id);
    if (!familyId || familyId !== payment.family_id) return null;
  }
  return getTenantFile(payment.proof_file_id);
};
