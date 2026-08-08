import type { BaseRequest, IplCreditLedgerInterface, IplReportRequest, IplReportSummaryInterface } from "@monorepo/types";
import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { addTenantScope, getCurrentTenantId } from "../utils/tenant-scope";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";

const canReadReport = () => hasMenuPermission("IPL_REPORT", PERMISSION.READ);

export const getIplReportSummaryService = async (request: IplReportRequest) => {
  if (!(await canReadReport())) return { status: 403, message: "Akses ditolak", data: null };
  const period = request.period?.trim() || null;
  const familyNoKk = request.family_no_kk?.trim() || null;
  const result = await pool.query<IplReportSummaryInterface>(
    `WITH filtered_bills AS (
       SELECT bill.* FROM ${tableNames.iplBill} bill
       INNER JOIN ${tableNames.masterFamily} family ON family.id = bill.family_id
       WHERE bill.is_deleted = false AND bill.status <> 'CANCELLED'
         AND bill.tenant_id IS NOT DISTINCT FROM $3::uuid
         AND ($1::text IS NULL OR bill.period ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR family.no_kk ILIKE '%' || $2 || '%')
     ), filtered_payments AS (
       SELECT payment.* FROM ${tableNames.iplPayment} payment
       INNER JOIN filtered_bills bill ON bill.id = payment.bill_id
       WHERE payment.is_deleted = false
         AND payment.tenant_id IS NOT DISTINCT FROM $3::uuid
     )
     SELECT
       COALESCE((SELECT SUM(amount) FROM filtered_bills), 0)::float8 AS total_billed,
       COALESCE((SELECT SUM(amount) FROM filtered_payments WHERE status = 'APPROVED'), 0)::float8 AS cash_received,
       COALESCE((SELECT SUM(paid_amount) FROM filtered_bills), 0)::float8 AS recognized_income,
       COALESCE((SELECT SUM(GREATEST(amount - paid_amount, 0)) FROM filtered_bills), 0)::float8 AS outstanding_amount,
       COALESCE((SELECT SUM(amount) FROM filtered_payments WHERE status = 'PENDING'), 0)::float8 AS pending_payment_amount,
       COALESCE((SELECT SUM(credit.balance) FROM ${tableNames.iplFamilyCredit} credit
         INNER JOIN ${tableNames.masterFamily} family ON family.id = credit.family_id
         WHERE credit.tenant_id IS NOT DISTINCT FROM $3::uuid
           AND ($2::text IS NULL OR family.no_kk ILIKE '%' || $2 || '%')), 0)::float8 AS family_credit_balance,
       (SELECT COUNT(*)::int FROM filtered_bills) AS total_bill_count,
       (SELECT COUNT(*)::int FROM filtered_bills WHERE status IN ('PAID', 'OVERPAID')) AS paid_bill_count`,
    [period, familyNoKk, getCurrentTenantId()],
  );
  return { status: 200, message: "Request successful", data: result.rows[0] };
};

export const loadCreditLedgerService = async (request: BaseRequest<IplCreditLedgerInterface>) => {
  if (!(await canReadReport())) return { status: 403, message: "Akses ditolak", data: [] };
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(request.metadata?.pageSize || 10), 1), 100);
  const offset = (page - 1) * pageSize;
  const params = request.params || {};
  const values: unknown[] = [];
  const where = [addTenantScope(values, "ledger.tenant_id")];
  if (params.family_no_kk) { values.push(`%${params.family_no_kk}%`); where.push(`family.no_kk ILIKE $${values.length}`); }
  if (params.transaction_type) { values.push(params.transaction_type); where.push(`ledger.transaction_type = $${values.length}`); }
  const clause = `WHERE ${where.join(" AND ")}`;
  const joins = `INNER JOIN ${tableNames.masterFamily} family ON family.id = ledger.family_id LEFT JOIN ${tableNames.iplBill} bill ON bill.id = ledger.bill_id`;
  const count = await pool.query(`SELECT COUNT(*) FROM ${tableNames.iplCreditLedger} ledger ${joins} ${clause}`, values);
  values.push(pageSize, offset);
  const data = await pool.query<IplCreditLedgerInterface>(
    `SELECT ledger.*, family.no_kk AS family_no_kk, bill.bill_number
     FROM ${tableNames.iplCreditLedger} ledger ${joins} ${clause}
     ORDER BY ledger.created_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values,
  );
  return { status: 200, message: "Request successful", data: data.rows, metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize } };
};
