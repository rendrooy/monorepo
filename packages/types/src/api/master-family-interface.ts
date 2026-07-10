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
