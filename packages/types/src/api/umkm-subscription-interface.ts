export type UmkmSubscriptionStatus = "DRAFT" | "PENDING_CONTENT_REVIEW" | "CONTENT_REJECTED" | "PENDING_PAYMENT_REVIEW" | "PAYMENT_REJECTED" | "READY_TO_RELEASE" | "ACTIVE" | "EXPIRED" | "CANCELLED";
export interface UmkmSubscriptionPlanInterface { id?:string|null; name?:string|null; price?:number|null; duration_days?:number|null; description?:string|null; is_active?:boolean|null; created_time?:string|null; }
export interface UmkmSubscriptionInterface {
  id?:string|null; umkm_id?:string|null; revision_id?:string|null; umkm_name?:string|null; owner_name?:string|null; family_no_kk?:string|null;
  plan_id?:string|null; plan_name?:string|null; price?:number|null; duration_days?:number|null; amount?:number|null;
  payment_date?:string|null; payment_method?:string|null; reference_number?:string|null; note?:string|null;
  proof_data?:string|null; proof_file_id?:string|null; proof_original_name?:string|null; proof_mime_type?:string|null; status?:UmkmSubscriptionStatus|null;
  rejection_note?:string|null; submitted_time?:string|null; reviewed_time?:string|null; ready_time?:string|null; released_time?:string|null; start_date?:string|null; end_date?:string|null; created_time?:string|null;
}
export interface UmkmSubscriptionReviewRequest { id?:string|null; note?:string|null; }
