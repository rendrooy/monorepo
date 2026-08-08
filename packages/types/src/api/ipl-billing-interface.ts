export type IplBillBatchStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export type IplBillStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERPAID" | "CANCELLED";
export type IplPaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVERSED";
export type IplPaymentMethod = "BANK_TRANSFER" | "CASH" | "OTHER";

export interface IplBillBatchInterface {
  id?: string | null;
  period?: string | null;
  amount?: number | null;
  note?: string | null;
  status?: IplBillBatchStatus | null;
  eligible_family_count?: number;
  generated_bill_count?: number;
  skipped_family_count?: number;
  published_time?: string | null;
  created_time?: string | null;
}

export interface IplPaymentInterface {
  id?: string | null;
  bill_id?: string | null;
  bill_number?: string | null;
  period?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  family_address?: string | null;
  amount?: number | null;
  allocated_amount?: number | null;
  credit_amount?: number | null;
  payment_date?: string | null;
  payment_method?: IplPaymentMethod | null;
  reference_number?: string | null;
  note?: string | null;
  proof_file_id?: string | null;
  proof_original_name?: string | null;
  proof_mime_type?: string | null;
  proof_size?: number | null;
  proof_data?: string | null;
  status?: IplPaymentStatus | null;
  rejection_note?: string | null;
  reversal_note?: string | null;
  submitted_by_role?: string | null;
  approved_time?: string | null;
  rejected_time?: string | null;
  reversed_time?: string | null;
  created_time?: string | null;
}

export interface IplPaymentActionRequest {
  id?: string | null;
  note?: string | null;
}

export interface IplReportSummaryInterface {
  total_billed: number;
  cash_received: number;
  recognized_income: number;
  outstanding_amount: number;
  pending_payment_amount: number;
  family_credit_balance: number;
  total_bill_count: number;
  paid_bill_count: number;
}

export interface IplReportRequest {
  period?: string | null;
  family_no_kk?: string | null;
}

export interface IplDashboardInterface {
  audience: "RESIDENT" | "MANAGEMENT";
  period: string;
  family_no_kk?: string | null;
  summary: IplReportSummaryInterface;
  pending_payment_count: number;
  recent_bills: IplBillInterface[];
  recent_payments: IplPaymentInterface[];
  income_summary: FinancialIncomeSummaryInterface;
  recent_transactions: FinancialTransactionInterface[];
}

export interface FinancialIncomeSummaryInterface {
  total_income: number;
  ipl_income: number;
  umkm_ads_income: number;
}

export interface FinancialTransactionInterface {
  id?: string | null;
  transaction_type?: "IPL" | "UMKM_ADS" | "DONATION" | "OTHER";
  direction?: "INCOME" | "EXPENSE";
  amount?: number | null;
  transaction_date?: string | null;
  status?: "POSTED" | "REVERSED";
  description?: string | null;
}

export interface IplFinancialTrendInterface {
  month: number;
  period: string;
  label: string;
  total_billed: number;
  recognized_income: number;
  cash_received: number;
  outstanding_amount: number;
  realization_percentage: number;
  total_income: number;
  ipl_income: number;
  umkm_ads_income: number;
}

export interface IplCreditLedgerInterface {
  id?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  bill_id?: string | null;
  bill_number?: string | null;
  payment_id?: string | null;
  transaction_type?: "EARNED" | "ALLOCATED" | "EARNED_REVERSED" | "ALLOCATION_REVERSED" | "REFUND";
  amount?: number | null;
  balance_after?: number | null;
  note?: string | null;
  created_time?: string | null;
}

export interface IplBillInterface {
  id?: string | null;
  batch_id?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  family_address?: string | null;
  bill_number?: string | null;
  period?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  credit_amount?: number | null;
  credit_applied_amount?: number | null;
  remaining_amount?: number | null;
  pending_payment_count?: number;
  note?: string | null;
  status?: IplBillStatus | null;
  created_time?: string | null;
}

export interface IplBillPublishResult {
  generated: number;
  skipped: number;
  eligible: number;
}

export interface AppNotificationInterface {
  id?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  reference_id?: string | null;
  reference_url?: string | null;
  is_read?: boolean;
  read_time?: string | null;
  created_time?: string | null;
}
