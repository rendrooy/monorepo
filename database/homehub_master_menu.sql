CREATE TABLE IF NOT EXISTS homehub_revamp.m_menu (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(100) NOT NULL,
    code varchar(100) NOT NULL,
    path_url varchar(255) NOT NULL,
    icon varchar(100),
    menu_level integer DEFAULT 1,
    parent_id uuid REFERENCES homehub_revamp.m_menu(id),
    sort_order integer DEFAULT 0,
    created_time timestamp DEFAULT now(),
    updated_time timestamp DEFAULT now(),
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean DEFAULT false,
    is_active boolean DEFAULT true
);


CREATE UNIQUE INDEX IF NOT EXISTS m_menu_code_uq
    ON homehub_revamp.m_menu (code)
    WHERE is_deleted = false;

ALTER TABLE homehub_revamp.m_menu
    ADD COLUMN IF NOT EXISTS menu_level integer DEFAULT 1;
