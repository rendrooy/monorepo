export interface MasterUserInterface {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  password?: string | null;
  token?: string | null;
  role_id?: string | null;
  role_name?: string | null;   // joined from m_role.name
  role_code?: string | null;   // joined from m_role.code
  member_id?: string | null;
  member_name?: string | null; // joined from m_member.name
  member_nik?: string | null;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_status?: "ACTIVE" | "EXPIRED" | "SUSPENDED" | null;
  registration_status?: "PENDING" | "APPROVED" | "REJECTED" | string | null;
  approved_time?: Date | string | null;
  approved_by_id?: string | null;
  rejected_time?: Date | string | null;
  rejected_by_id?: string | null;
  rejection_note?: string | null;
  created_time?: Date | null;
  updated_time?: Date | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  is_active?: boolean;
  is_deleted?: boolean;
}
