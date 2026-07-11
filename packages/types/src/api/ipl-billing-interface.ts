export type IplBillBatchStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export type IplBillStatus = "UNPAID" | "CANCELLED";

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

export interface IplBillInterface {
  id?: string | null;
  batch_id?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  family_address?: string | null;
  bill_number?: string | null;
  period?: string | null;
  amount?: number | null;
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
