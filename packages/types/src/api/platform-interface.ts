import type { AuthTokenPayload } from "./auth-interface";

export interface CreateTenantRequest {
  address?: null | string;
  admin_email?: null | string;
  admin_password?: null | string;
  admin_username?: null | string;
  code?: null | string;
  contact_email?: null | string;
  contact_name?: null | string;
  contact_phone?: null | string;
  name?: null | string;
  plan_id?: null | string;
  slug?: null | string;
}

export interface CreateTenantResponse {
  admin_user_id: string;
  tenant: TenantInterface;
}

export interface PlatformAuthTokenPayload extends AuthTokenPayload {
  identity_type: "PLATFORM";
  tenant_id?: null;
}

export interface PlatformLoginRequest {
  email?: null | string;
  password?: null | string;
  username?: null | string;
}

export interface PlatformLoginResponse {
  access_token: string;
  user: PlatformUserInterface;
}

export interface PlatformUserInterface {
  email: string;
  id: string;
  role_code: string;
  role_id: string;
  role_name: string;
  username: string;
}

export interface TenantInterface {
  address?: null | string;
  code: string;
  contact_email?: null | string;
  contact_name?: null | string;
  contact_phone?: null | string;
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
}

export type PlatformPlanCode = "FREE" | "EXTRA" | "SUPER";

export interface PlatformPlanInterface {
  billing_period: "MONTHLY";
  code: PlatformPlanCode;
  entitlements?: PlatformPlanEntitlementInterface[];
  id: string;
  name: string;
  price: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface PlatformPlanEntitlementInterface {
  enabled: boolean;
  feature_code: string;
  feature_name: string;
  limit_value?: null | number;
  value_type: "BOOLEAN" | "NUMBER";
}

export interface UpdatePlatformPlanRequest {
  name?: null | string;
  plan_id?: null | string;
  price?: null | number;
  status?: "ACTIVE" | "INACTIVE" | null;
}

export interface TenantInvoiceInterface {
  amount: number;
  billing_period: string;
  due_date: string;
  id: string;
  invoice_number: string;
  paid_time?: null | string;
  payment_id?: null | string;
  payment_status?: "APPROVED" | "PENDING" | "REJECTED" | null;
  plan_code: PlatformPlanCode;
  plan_name: string;
  status: "DRAFT" | "ISSUED" | "OVERDUE" | "PAID" | "VOID";
}

export interface TenantBillingSummaryInterface {
  invoice?: null | TenantInvoiceInterface;
  next_plan_code?: null | PlatformPlanCode;
  plan: PlatformPlanInterface;
  storage_limit_bytes: number;
  storage_usage_bytes: number;
  subscription_status: "ACTIVE" | "CANCELED" | "EXPIRED" | "SUSPENDED";
}

export interface CreateTenantSubscriptionPaymentRequest {
  amount?: null | number;
  invoice_id?: null | string;
  paid_time?: null | string;
  proof_data?: null | string;
  proof_original_name?: null | string;
  provider_reference?: null | string;
}

export interface RequestTenantPlanChangeRequest {
  plan_code?: null | PlatformPlanCode;
}

export interface ReviewTenantSubscriptionPaymentRequest {
  note?: null | string;
  payment_id?: null | string;
}

export interface ApproveTenantPlanChangeRequest {
  subscription_id?: null | string;
}

export interface PlatformTenantListItem extends TenantInterface {
  current_period_end?: null | string;
  plan_code?: null | PlatformPlanCode;
  plan_name?: null | string;
  storage_limit_bytes: number;
  storage_usage_bytes: number;
  subscription_id?: null | string;
  subscription_status?: null | "ACTIVE" | "CANCELED" | "EXPIRED" | "SUSPENDED";
}

export interface PlatformTenantDetailInterface {
  admin: {
    email: string;
    id: string;
    username: string;
  } | null;
  invoices: TenantInvoiceInterface[];
  tenant: PlatformTenantListItem;
}

export interface PlatformTenantStatusRequest {
  status?: "ACTIVE" | "SUSPENDED" | null;
  tenant_id?: null | string;
}

export interface PlatformAuditLogInterface {
  action: string;
  actor_id?: null | string;
  actor_type: "PLATFORM" | "SYSTEM" | "TENANT";
  created_time: string;
  entity_id?: null | string;
  entity_type?: null | string;
  id: string;
  metadata: Record<string, unknown>;
  tenant_code?: null | string;
  tenant_id?: null | string;
  tenant_name?: null | string;
}
