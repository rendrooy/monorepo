export interface MasterMenuInterface {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    path_url?: string | null;
    icon?: string | null;
    menu_level?: number | null;
    parent_id?: string | null;
    parent_name?: string | null;
    sort_order?: number | null;
    created_time?: Date | string | null;
    updated_time?: Date | string | null;
    created_by_id?: string | null;
    updated_by_id?: string | null;
    is_active?: boolean;
    is_deleted?: boolean;
}
