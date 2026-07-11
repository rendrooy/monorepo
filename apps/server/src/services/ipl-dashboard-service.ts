import type { IplBillInterface, IplDashboardInterface, IplPaymentInterface, IplReportSummaryInterface } from "@monorepo/types";
import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";

const residentRoles = new Set(["WRG", "WARGA"]);

const findFamily = async (userId?: string | null) => {
  const result = await pool.query<{ family_id: string | null; no_kk: string | null }>(
    `SELECT member.family_id, family.no_kk
     FROM ${tableNames.masterUser} users
     LEFT JOIN ${tableNames.masterMember} member ON member.id = users.member_id
     LEFT JOIN ${tableNames.masterFamily} family ON family.id = member.family_id
     WHERE users.id = $1`,
    [userId],
  );
  return result.rows[0] || null;
};

export const getIplDashboardService = async (period?: string | null) => {
  const auth = getCurrentAuth();
  const roleCode = (auth?.role_code || "").toUpperCase();
  const resident = residentRoles.has(roleCode);
  const family = resident ? await findFamily(auth?.user_id) : null;
  if (resident && !family?.family_id) {
    return { status: 200, message: "Akun belum terhubung dengan keluarga", data: emptyDashboard(period || "", true) };
  }

  const selectedPeriod = period?.trim().toUpperCase() || null;
  const familyId = family?.family_id || null;
  const summaryResult = await pool.query<IplReportSummaryInterface & { pending_payment_count: number }>(
    `WITH filtered_bills AS (
       SELECT bill.* FROM ${tableNames.iplBill} bill
       WHERE bill.is_deleted = false AND bill.status <> 'CANCELLED'
         AND ($1::text IS NULL OR bill.period = $1)
         AND ($2::uuid IS NULL OR bill.family_id = $2)
     ), filtered_payments AS (
       SELECT payment.* FROM ${tableNames.iplPayment} payment
       INNER JOIN filtered_bills bill ON bill.id = payment.bill_id
       WHERE payment.is_deleted = false
     )
     SELECT
       COALESCE((SELECT SUM(amount) FROM filtered_bills), 0)::float8 AS total_billed,
       COALESCE((SELECT SUM(amount) FROM filtered_payments WHERE status = 'APPROVED'), 0)::float8 AS cash_received,
       COALESCE((SELECT SUM(paid_amount) FROM filtered_bills), 0)::float8 AS recognized_income,
       COALESCE((SELECT SUM(GREATEST(amount - paid_amount, 0)) FROM filtered_bills), 0)::float8 AS outstanding_amount,
       COALESCE((SELECT SUM(amount) FROM filtered_payments WHERE status = 'PENDING'), 0)::float8 AS pending_payment_amount,
       COALESCE((SELECT SUM(credit.balance) FROM ${tableNames.iplFamilyCredit} credit WHERE $2::uuid IS NULL OR credit.family_id = $2), 0)::float8 AS family_credit_balance,
       (SELECT COUNT(*)::int FROM filtered_bills) AS total_bill_count,
       (SELECT COUNT(*)::int FROM filtered_bills WHERE status IN ('PAID', 'OVERPAID')) AS paid_bill_count,
       (SELECT COUNT(*)::int FROM filtered_payments WHERE status = 'PENDING') AS pending_payment_count`,
    [selectedPeriod, familyId],
  );
  const summaryRow = summaryResult.rows[0];

  const bills = await pool.query<IplBillInterface>(
    `SELECT bill.*, family.no_kk AS family_no_kk, family.address AS family_address,
       GREATEST(bill.amount - bill.paid_amount, 0) AS remaining_amount,
       COALESCE((SELECT SUM(-ledger.amount) FROM ${tableNames.iplCreditLedger} ledger
        WHERE ledger.bill_id = bill.id AND ledger.transaction_type = 'ALLOCATED'
          AND NOT EXISTS (SELECT 1 FROM ${tableNames.iplCreditLedger} reversal WHERE reversal.related_ledger_id = ledger.id)), 0) AS credit_applied_amount
     FROM ${tableNames.iplBill} bill INNER JOIN ${tableNames.masterFamily} family ON family.id = bill.family_id
     WHERE bill.is_deleted = false AND bill.status <> 'CANCELLED'
       AND ($1::text IS NULL OR bill.period = $1) AND ($2::uuid IS NULL OR bill.family_id = $2)
     ORDER BY bill.created_time DESC LIMIT 5`,
    [selectedPeriod, familyId],
  );
  const payments = await pool.query<IplPaymentInterface>(
    `SELECT payment.*, bill.bill_number, bill.period, family.no_kk AS family_no_kk
     FROM ${tableNames.iplPayment} payment
     INNER JOIN ${tableNames.iplBill} bill ON bill.id = payment.bill_id
     INNER JOIN ${tableNames.masterFamily} family ON family.id = payment.family_id
     WHERE payment.is_deleted = false AND ($1::text IS NULL OR bill.period = $1)
       AND ($2::uuid IS NULL OR payment.family_id = $2)
     ORDER BY payment.created_time DESC LIMIT 5`,
    [selectedPeriod, familyId],
  );

  const data: IplDashboardInterface = {
    audience: resident ? "RESIDENT" : "MANAGEMENT",
    period: selectedPeriod || "ALL",
    family_no_kk: family?.no_kk,
    summary: {
      total_billed: Number(summaryRow?.total_billed || 0), cash_received: Number(summaryRow?.cash_received || 0),
      recognized_income: Number(summaryRow?.recognized_income || 0), outstanding_amount: Number(summaryRow?.outstanding_amount || 0),
      pending_payment_amount: Number(summaryRow?.pending_payment_amount || 0), family_credit_balance: Number(summaryRow?.family_credit_balance || 0),
      total_bill_count: Number(summaryRow?.total_bill_count || 0), paid_bill_count: Number(summaryRow?.paid_bill_count || 0),
    },
    pending_payment_count: Number(summaryRow?.pending_payment_count || 0),
    recent_bills: bills.rows,
    recent_payments: payments.rows,
  };
  return { status: 200, message: "Request successful", data };
};

export const getIplFinancialTrendService = async (year?: number | null) => {
  const roleCode = (getCurrentAuth()?.role_code || "").toUpperCase();
  if (residentRoles.has(roleCode)) return { status: 403, message: "Akses ditolak", data: [] };
  const selectedYear = Number(year) || new Date().getFullYear();
  if (selectedYear < 2000 || selectedYear > 2100) return { status: 400, message: "Tahun tidak valid", data: [] };
  const result = await pool.query(
    `WITH months AS (
       SELECT month_number,
         (ARRAY['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'])[month_number] AS month_code
       FROM generate_series(1, 12) AS series(month_number)
     ), bill_summary AS (
       SELECT period, SUM(amount)::float8 AS total_billed,
         SUM(paid_amount)::float8 AS recognized_income,
         SUM(GREATEST(amount - paid_amount, 0))::float8 AS outstanding_amount
       FROM ${tableNames.iplBill}
       WHERE is_deleted = false AND status <> 'CANCELLED' AND RIGHT(period, 4) = $1::text
       GROUP BY period
     ), payment_summary AS (
       SELECT bill.period, SUM(payment.amount)::float8 AS cash_received
       FROM ${tableNames.iplPayment} payment
       INNER JOIN ${tableNames.iplBill} bill ON bill.id = payment.bill_id
       WHERE payment.is_deleted = false AND payment.status = 'APPROVED' AND RIGHT(bill.period, 4) = $1::text
       GROUP BY bill.period
     )
     SELECT months.month_number::int AS month,
       months.month_code || '-' || $1::text AS period,
       months.month_code AS label,
       COALESCE(bill.total_billed, 0)::float8 AS total_billed,
       COALESCE(bill.recognized_income, 0)::float8 AS recognized_income,
       COALESCE(payment.cash_received, 0)::float8 AS cash_received,
       COALESCE(bill.outstanding_amount, 0)::float8 AS outstanding_amount,
       CASE WHEN COALESCE(bill.total_billed, 0) > 0
         THEN ROUND((bill.recognized_income / bill.total_billed * 100)::numeric, 2)::float8 ELSE 0 END AS realization_percentage
     FROM months
     LEFT JOIN bill_summary bill ON bill.period = months.month_code || '-' || $1::text
     LEFT JOIN payment_summary payment ON payment.period = months.month_code || '-' || $1::text
     ORDER BY months.month_number`,
    [selectedYear],
  );
  return { status: 200, message: "Request successful", data: result.rows };
};

const emptyDashboard = (period: string, resident: boolean): IplDashboardInterface => ({
  audience: resident ? "RESIDENT" : "MANAGEMENT", period, family_no_kk: null,
  summary: { total_billed: 0, cash_received: 0, recognized_income: 0, outstanding_amount: 0, pending_payment_amount: 0, family_credit_balance: 0, total_bill_count: 0, paid_bill_count: 0 },
  pending_payment_count: 0, recent_bills: [], recent_payments: [],
});
