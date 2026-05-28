export interface MasterUserInterface {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  password?: string | null;
  token?: string | null;
  role_id?: string | null;
  role_name?: string | null;   // joined from m_role.name
  member_id?: string | null;
  member_name?: string | null; // joined from m_member.name
  created_time?: Date | null;
  updated_time?: Date | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  is_deleted?: boolean;
}
