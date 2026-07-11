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

const PERIOD_PATTERN = /^(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES)-\d{4}$/;

const paging = (request: BaseRequest) => {
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(request.metadata?.pageSize || 10), 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
};

export const loadBillBatchService = async (request: BaseRequest<IplBillBatchInterface>) => {
  const { page, pageSize, offset } = paging(request);
  const params = request.params || {};
  const values: unknown[] = [];
  const where = ["b.is_deleted = false"];

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
        WHERE f.status_dom = 1 AND f.is_active = true AND f.is_deleted = false) AS eligible_family_count,
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
  const result = await pool.query<IplBillBatchInterface>(
    `SELECT b.*,
       (SELECT COUNT(*)::int FROM ${tableNames.masterFamily} f
        WHERE f.status_dom = 1 AND f.is_active = true AND f.is_deleted = false) AS eligible_family_count,
       (SELECT COUNT(*)::int FROM ${tableNames.iplBill} bill
        WHERE bill.batch_id = b.id AND bill.is_deleted = false) AS generated_bill_count
     FROM ${tableNames.iplBillBatch} b WHERE b.id = $1 AND b.is_deleted = false`,
    [id],
  );
  return result.rows[0]
    ? { status: 200, message: "Request successful", data: result.rows[0] }
    : { status: 404, message: "Batch tagihan tidak ditemukan", data: null };
};

export const createBillBatchService = async (request: IplBillBatchInterface) => {
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
    `INSERT INTO ${tableNames.iplBillBatch} (period, amount, note, created_by_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [period, amount, request.note?.trim() || null, auth?.user_id || null],
  );
  return { status: 201, message: "Draft tagihan berhasil dibuat", data: result.rows[0] };
};

export const updateBillBatchService = async (request: IplBillBatchInterface) => {
  const current = await getBillBatchService(request.id);
  if (!current.data) return current;
  const auth = getCurrentAuth();
  const isDraft = current.data.status === "DRAFT";
  const period = request.period?.trim().toUpperCase();
  const amount = Number(request.amount);
  if (isDraft && (!period || !PERIOD_PATTERN.test(period) || !Number.isFinite(amount) || amount <= 0)) {
    return { status: 400, message: "Periode atau nominal tagihan tidak valid", data: null };
  }
  const result = await pool.query<IplBillBatchInterface>(
    `UPDATE ${tableNames.iplBillBatch}
     SET period = CASE WHEN status = 'DRAFT' THEN $2 ELSE period END,
         amount = CASE WHEN status = 'DRAFT' THEN $3 ELSE amount END,
         note = $4, updated_time = now(), updated_by_id = $5
     WHERE id = $1 AND status <> 'CANCELLED' AND is_deleted = false RETURNING *`,
    [request.id, period || current.data.period, isDraft ? amount : current.data.amount, request.note?.trim() || null, auth?.user_id || null],
  );
  return result.rows[0]
    ? { status: 200, message: "Draft tagihan berhasil diperbarui", data: result.rows[0] }
    : { status: 409, message: "Batch tagihan tidak dapat diperbarui", data: null };
};

export const publishBillBatchService = async (id?: string | null) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batchResult = await client.query<IplBillBatchInterface>(
      `SELECT * FROM ${tableNames.iplBillBatch}
       WHERE id = $1 AND status = 'DRAFT' AND is_deleted = false FOR UPDATE`,
      [id],
    );
    const batch = batchResult.rows[0];
    if (!batch) {
      await client.query("ROLLBACK");
      return { status: 409, message: "Hanya draft yang dapat diterbitkan", data: null };
    }

    const families = await client.query<{ id: string }>(
      `SELECT f.id FROM ${tableNames.masterFamily} f
       WHERE f.status_dom = 1 AND f.is_active = true AND f.is_deleted = false
       ORDER BY f.created_time ASC`,
    );
    let generated = 0;
    for (const family of families.rows) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO ${tableNames.iplBill}
           (batch_id, family_id, bill_number, period, amount, note, created_by_id)
         SELECT $1, $2,
           'IPL-' || $3 || '-' || LPAD(nextval('homehub_revamp.ipl_bill_number_seq')::text, 6, '0'),
           $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM ${tableNames.iplBill}
           WHERE family_id = $2 AND period = $3 AND status <> 'CANCELLED' AND is_deleted = false
         ) RETURNING id`,
        [batch.id, family.id, batch.period, batch.amount, batch.note, getCurrentAuth()?.user_id || null],
      );
      const bill = inserted.rows[0];
      if (!bill) continue;
      generated += 1;
      await client.query(
        `INSERT INTO ${tableNames.notification}
           (user_id, type, title, message, reference_id, reference_url, created_by_id)
         SELECT DISTINCT u.id, 'IPL_BILL_PUBLISHED', 'Tagihan IPL baru',
           'Tagihan IPL periode ' || $2 || ' telah diterbitkan.', $1::uuid, '/ipl/bill', $3::uuid
         FROM ${tableNames.masterUser} u
         INNER JOIN ${tableNames.masterMember} m ON u.member_id = m.id
         WHERE m.family_id = $4::uuid AND u.is_active = true AND u.is_deleted = false`,
        [bill.id, batch.period, getCurrentAuth()?.user_id || null, family.id],
      );
    }

    await client.query(
      `UPDATE ${tableNames.iplBillBatch}
       SET status = 'PUBLISHED', published_time = now(), published_by_id = $2,
           updated_time = now(), updated_by_id = $2 WHERE id = $1`,
      [batch.id, getCurrentAuth()?.user_id || null],
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
    console.error("publishBillBatchService error:", error);
    return { status: 500, message: "Gagal menerbitkan tagihan", data: null };
  } finally {
    client.release();
  }
};

export const cancelBillBatchService = async (id?: string | null) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE ${tableNames.iplBillBatch} SET status = 'CANCELLED', updated_time = now(), updated_by_id = $2
       WHERE id = $1 AND status <> 'CANCELLED' AND is_deleted = false RETURNING id`,
      [id, getCurrentAuth()?.user_id || null],
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return { status: 409, message: "Batch tagihan tidak dapat dibatalkan", data: null };
    }
    await client.query(
      `UPDATE ${tableNames.iplBill} SET status = 'CANCELLED', updated_time = now(), updated_by_id = $2
       WHERE batch_id = $1 AND status = 'UNPAID' AND is_deleted = false`,
      [id, getCurrentAuth()?.user_id || null],
    );
    await client.query("COMMIT");
    return { status: 200, message: "Batch tagihan berhasil dibatalkan", data: null };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("cancelBillBatchService error:", error);
    return { status: 500, message: "Gagal membatalkan tagihan", data: null };
  } finally {
    client.release();
  }
};

const loadBills = async (request: BaseRequest<IplBillInterface>, familyId?: string | null) => {
  const { page, pageSize, offset } = paging(request);
  const params = request.params || {};
  const values: unknown[] = [];
  const where = ["bill.is_deleted = false"];
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
       (SELECT COUNT(*)::int FROM ${tableNames.iplPayment} p
        WHERE p.bill_id = bill.id AND p.status = 'PENDING' AND p.is_deleted = false) AS pending_payment_count
     FROM ${tableNames.iplBill} bill INNER JOIN ${tableNames.masterFamily} f ON f.id = bill.family_id
     ${clause} ORDER BY bill.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { status: 200, message: "Request successful", data: data.rows, metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize } };
};

export const loadBillService = (request: BaseRequest<IplBillInterface>) => loadBills(request);

export const loadMyBillService = async (request: BaseRequest<IplBillInterface>) => {
  const auth = getCurrentAuth();
  const family = await pool.query<{ family_id: string | null }>(
    `SELECT m.family_id FROM ${tableNames.masterUser} u
     LEFT JOIN ${tableNames.masterMember} m ON m.id = u.member_id WHERE u.id = $1`,
    [auth?.user_id],
  );
  const familyId = family.rows[0]?.family_id;
  if (!familyId) return { status: 200, message: "Akun belum terhubung dengan keluarga", data: [], metaData: { total: 0, page: 1, pageSize: 10 } };
  return loadBills(request, familyId);
};

export const loadNotificationService = async () => {
  const result = await pool.query<AppNotificationInterface>(
    `SELECT * FROM ${tableNames.notification}
     WHERE user_id = $1 AND is_deleted = false ORDER BY created_time DESC LIMIT 20`,
    [getCurrentAuth()?.user_id],
  );
  return { status: 200, message: "Request successful", data: result.rows };
};

export const readNotificationService = async (id?: string | null) => {
  const result = await pool.query(
    `UPDATE ${tableNames.notification} SET is_read = true, read_time = now()
     WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING id`,
    [id, getCurrentAuth()?.user_id],
  );
  return result.rowCount
    ? { status: 200, message: "Notifikasi sudah dibaca", data: null }
    : { status: 404, message: "Notifikasi tidak ditemukan", data: null };
};
