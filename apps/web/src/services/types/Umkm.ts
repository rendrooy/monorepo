import type { BaseRequest, BaseResponse, UmkmAdInterface, UmkmCategoryOption, UmkmInterface, UmkmReviewRequest, UmkmSubscriptionInterface, UmkmSubscriptionPlanInterface, UmkmSubscriptionReviewRequest } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";
export interface UmkmMapping {
  getUmkmCategories: ServiceStructure<{body:Record<string,never>;response:BaseResponse<UmkmCategoryOption[]>}>;
  loadActiveUmkmAds: ServiceStructure<{body:Record<string,never>;response:BaseResponse<UmkmAdInterface[]>}>;
  loadMyUmkm: ServiceStructure<{body:BaseRequest<UmkmInterface>;response:BaseResponse<UmkmInterface[]>}>;
  saveUmkmDraft: ServiceStructure<{body:UmkmInterface;response:BaseResponse<UmkmInterface>}>;
  submitUmkm: ServiceStructure<{body:UmkmInterface;response:BaseResponse}>;
  suspendUmkm: ServiceStructure<{body:UmkmInterface;response:BaseResponse}>;
  resumeUmkm: ServiceStructure<{body:UmkmInterface;response:BaseResponse}>;
  loadUmkmReview: ServiceStructure<{body:BaseRequest<UmkmInterface>;response:BaseResponse<UmkmInterface[]>}>;
  approveUmkm: ServiceStructure<{body:UmkmReviewRequest;response:BaseResponse}>;
  rejectUmkm: ServiceStructure<{body:UmkmReviewRequest;response:BaseResponse}>;
  loadActiveUmkmPlans:ServiceStructure<{body:Record<string,never>;response:BaseResponse<UmkmSubscriptionPlanInterface[]>}>;
  loadUmkmPlans:ServiceStructure<{body:Record<string,never>;response:BaseResponse<UmkmSubscriptionPlanInterface[]>}>;
  saveUmkmPlan:ServiceStructure<{body:UmkmSubscriptionPlanInterface;response:BaseResponse<UmkmSubscriptionPlanInterface>}>;
  createUmkmSubscription:ServiceStructure<{body:UmkmSubscriptionInterface;response:BaseResponse<UmkmSubscriptionInterface>}>;
  loadMyUmkmSubscriptions:ServiceStructure<{body:Record<string,never>;response:BaseResponse<UmkmSubscriptionInterface[]>}>;
  payUmkmSubscription:ServiceStructure<{body:UmkmSubscriptionInterface;response:BaseResponse<UmkmSubscriptionInterface>}>;
  releaseUmkmSubscription:ServiceStructure<{body:UmkmSubscriptionInterface;response:BaseResponse}>;
  loadUmkmPaymentReviews:ServiceStructure<{body:BaseRequest<UmkmSubscriptionInterface>;response:BaseResponse<UmkmSubscriptionInterface[]>}>;
  approveUmkmPayment:ServiceStructure<{body:UmkmSubscriptionReviewRequest;response:BaseResponse}>;
  rejectUmkmPayment:ServiceStructure<{body:UmkmSubscriptionReviewRequest;response:BaseResponse}>;
}
