import type { BaseRequest } from "./base-request";

export interface MasterUserInterface  {
  id?: string;
  username?: string;
  email?: string;
  password?: string;
  token?: string | null;
  role_id?: string | null;
  member_id?: string | null;
  created_time?: Date;
  updated_time?: Date;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  is_deleted?: boolean;
}