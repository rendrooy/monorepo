export interface MasterRoleMenuPermissionInterface {
    id?: string | null;
    role_id?: string | null;
    menu_id?: string | null;
    menu_name?: string | null;
    menu_code?: string | null;
    menu_level?: number | null;
    parent_id?: string | null;
    path_url?: string | null;
    permission_mask?: number | null;
    created_time?: Date | string | null;
    updated_time?: Date | string | null;
    created_by_id?: string | null;
    updated_by_id?: string | null;
    is_active?: boolean;
    is_deleted?: boolean;
}

export interface MasterRoleInterface {
    id?: string;
    name?: string;
    code?: string;
    desc?: string | null;
    role_permissions?: MasterRoleMenuPermissionInterface[];
    created_time?: Date;
    updated_time?: Date;
    created_by_id?: string | null;
    updated_by_id?: string | null;
    is_active?: boolean;
    is_deleted?: boolean;
}
