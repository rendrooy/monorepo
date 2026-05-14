export interface MasterMemberInterface {
    id?: string | null; // uuid
    nik?: string | null;
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    blood_type?: string | null; // bisa lu map ke enum nanti
    sex?: string | null;        // enum juga (misal 1 = male, 2 = female)
    bod?: string | null; // ISO date string (timestamp with time zone)
    boc?: string | null;
    profession?: string | null;
    religion?: string | null; // enum
    family_relation?: string | null;
    family_id?: string | null;
    created_time?: string | null;
    updated_time?: string | null;
    created_by_id?: string | null;
    updated_by_id?: string | null;
    is_deleted?: boolean;
}