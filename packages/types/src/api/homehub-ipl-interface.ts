export interface MasterFamilyInterface {
  id?: string | null;
  no_kk?: string | null;
  no_pbb?: string | null;
  address?: string | null;
  postal_code?: string | null;
  status_adm?: number | null;
  status_dom?: number | null;
  created_time?: string | null;
  updated_time?: string | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
  member_id?: string | null;
  member_ids?: string[];
  family_members?: Array<{
    member_id: string;
    member_name?: string | null;
    member_nik?: string | null;
    family_relation?: string | null;
  }>;
}

export interface IplSettingInterface {
  id?: string | null;
  name?: string | null;
  monthly_amount?: number | null;
  due_day?: number | null;
  is_active?: boolean;
  created_time?: string | null;
  updated_time?: string | null;
  is_deleted?: boolean;
}

export type IplBillStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";

export interface IplBillInterface {
  id?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  family_address?: string | null;
  period_month?: number | null;
  period_year?: number | null;
  amount?: number | null;
  paid_amount?: number | null;
  status?: IplBillStatus | null;
  due_date?: string | null;
  created_time?: string | null;
  updated_time?: string | null;
  is_deleted?: boolean;
}

export interface IplGenerateBillRequest {
  period_month?: number | null;
  period_year?: number | null;
  amount?: number | null;
  due_day?: number | null;
}

export interface IplGenerateBillResult {
  generated: number;
  skipped: number;
}

export interface IplPaymentInterface {
  id?: string | null;
  bill_id?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  family_address?: string | null;
  period_month?: number | null;
  period_year?: number | null;
  payment_date?: string | null;
  amount?: number | null;
  payment_method?: string | null;
  note?: string | null;
  created_time?: string | null;
  updated_time?: string | null;
  is_deleted?: boolean;
}

export interface ExpenseInterface {
  id?: string | null;
  expense_date?: string | null;
  category?: string | null;
  description?: string | null;
  amount?: number | null;
  created_time?: string | null;
  updated_time?: string | null;
  is_deleted?: boolean;
}

export interface IplDashboardRequest {
  period_month?: number | null;
  period_year?: number | null;
}

export interface IplDashboardInterface {
  period_month: number;
  period_year: number;
  total_bill: number;
  total_payment: number;
  total_outstanding: number;
  paid_count: number;
  unpaid_count: number;
  partial_count: number;
  overdue_count: number;
}

export interface CashReportInterface {
  period_month: number;
  period_year: number;
  opening_balance: number;
  total_income: number;
  total_expense: number;
  ending_balance: number;
}
