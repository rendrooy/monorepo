export type UmkmCategory = "FOOD_BEVERAGE" | "GROCERY" | "FASHION" | "HEALTH_BEAUTY" | "SERVICE" | "CRAFT" | "ELECTRONIC" | "AUTOMOTIVE" | "AGRICULTURE" | "EDUCATION" | "PROPERTY" | "OTHER";
export type UmkmStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type UmkmRevisionStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export interface UmkmCategoryOption { value: UmkmCategory; label: string; }
export interface UmkmInterface {
  id?: string | null; revision_id?: string | null; approved_revision_id?: string | null; owner_user_id?: string | null; family_id?: string | null;
  owner_name?: string | null; family_no_kk?: string | null; version_no?: number | null; name?: string | null; category?: UmkmCategory | null;
  category_label?: string | null; description?: string | null; address?: string | null; whatsapp?: string | null; external_url?: string | null;
  image_data?: string | null; image_original_name?: string | null; image_mime_type?: string | null; image_size?: number | null;
  plan_id?: string | null; subscription_id?: string | null; subscription_status?: string | null;
  operational_status?: UmkmStatus | null;
  status?: UmkmStatus | UmkmRevisionStatus | null; review_note?: string | null; reviewed_time?: string | null; created_time?: string | null;
}
export interface UmkmReviewRequest { id?: string | null; note?: string | null; }
