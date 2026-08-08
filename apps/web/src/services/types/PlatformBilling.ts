import type {
  BaseRequest,
  BaseResponse,
  CreateTenantSubscriptionPaymentRequest,
  PlatformPlanInterface,
  RequestTenantPlanChangeRequest,
  TenantBillingSummaryInterface,
  TenantInvoiceInterface,
} from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface PlatformBillingMapping {
  getTenantBillingSummary: ServiceStructure<{ body: Record<string, never>; response: BaseResponse<TenantBillingSummaryInterface | null> }>;
  loadTenantInvoices: ServiceStructure<{ body: BaseRequest; response: BaseResponse<TenantInvoiceInterface[]> }>;
  requestTenantPlanChange: ServiceStructure<{ body: RequestTenantPlanChangeRequest; response: BaseResponse<null> }>;
  createTenantSubscriptionPayment: ServiceStructure<{ body: CreateTenantSubscriptionPaymentRequest; response: BaseResponse<null> }>;
  loadPlatformPlansForTenant: ServiceStructure<{ body: Record<string, never>; response: BaseResponse<PlatformPlanInterface[]> }>;
}
