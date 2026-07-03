export interface MasterRoleInterface {
    id?: string;
    name?: string;
    code?: string;
    created_time?: Date;
    updated_time?: Date;
    created_by_id?: string | null;
    updated_by_id?: string | null;
    is_active?: boolean;
    is_deleted?: boolean;
}
