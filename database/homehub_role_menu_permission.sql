ALTER TABLE homehub_revamp.m_role
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE TABLE IF NOT EXISTS homehub_revamp.m_role_menu_permission (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES homehub_revamp.m_role(id),
    menu_id uuid NOT NULL REFERENCES homehub_revamp.m_menu(id),
    permission_mask integer NOT NULL DEFAULT 0,
    created_time timestamp DEFAULT now(),
    updated_time timestamp DEFAULT now(),
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean DEFAULT false,
    is_active boolean DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS m_role_menu_permission_uq
    ON homehub_revamp.m_role_menu_permission (role_id, menu_id)
    WHERE is_deleted = false;
