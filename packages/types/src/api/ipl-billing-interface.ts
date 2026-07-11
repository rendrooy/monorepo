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
