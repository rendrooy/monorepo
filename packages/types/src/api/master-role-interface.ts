import type { BaseRequest } from "./base-request";

export interface MasterRoleInterface {
    map(arg0: (item: any) => void): unknown;
    id?: string;
    name?: string;
    code?: string;
    created_time?: Date;
    updated_time?: Date;
    created_by_id?: string | null;
    updated_by_id?: string | null;
    is_deleted?: boolean;
}