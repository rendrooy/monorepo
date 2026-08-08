CREATE TABLE m_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL,
  slug varchar(100) NOT NULL,
  name varchar(255) NOT NULL,
  address text,
  contact_name varchar(255),
  contact_email varchar(255),
  contact_phone varchar(50),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED')),
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  created_by_platform_user_id uuid,
  updated_by_platform_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_tenant_code_active
  ON m_tenant (lower(code)) WHERE is_deleted = false;
CREATE UNIQUE INDEX uq_tenant_slug_active
  ON m_tenant (lower(slug)) WHERE is_deleted = false;

CREATE TABLE m_tenant_setting (
  tenant_id uuid NOT NULL REFERENCES m_tenant(id),
  setting_key varchar(100) NOT NULL,
  setting_value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  PRIMARY KEY (tenant_id, setting_key)
);

CREATE TABLE m_tenant_area (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES m_tenant(id),
  parent_id uuid,
  area_type varchar(10) NOT NULL CHECK (area_type IN ('RW', 'RT')),
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, parent_id) REFERENCES m_tenant_area(tenant_id, id)
);

CREATE UNIQUE INDEX uq_tenant_area_code_active
  ON m_tenant_area (tenant_id, area_type, lower(code)) WHERE is_deleted = false;
CREATE INDEX ix_tenant_area_parent ON m_tenant_area (tenant_id, parent_id);

CREATE TABLE m_platform_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_platform_role_code_active
  ON m_platform_role (lower(code)) WHERE is_deleted = false;

CREATE TABLE m_platform_permission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL,
  name varchar(255) NOT NULL,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_platform_permission_code_active
  ON m_platform_permission (lower(code)) WHERE is_deleted = false;

CREATE TABLE m_platform_role_permission (
  role_id uuid NOT NULL REFERENCES m_platform_role(id),
  permission_id uuid NOT NULL REFERENCES m_platform_permission(id),
  created_time timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE m_platform_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES m_platform_role(id),
  username varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  password varchar(255) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  last_login_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_platform_user_username_active
  ON m_platform_user (lower(username)) WHERE is_deleted = false;
CREATE UNIQUE INDEX uq_platform_user_email_active
  ON m_platform_user (lower(email)) WHERE is_deleted = false;

ALTER TABLE m_tenant
  ADD CONSTRAINT fk_tenant_created_by_platform_user
  FOREIGN KEY (created_by_platform_user_id) REFERENCES m_platform_user(id);
ALTER TABLE m_tenant
  ADD CONSTRAINT fk_tenant_updated_by_platform_user
  FOREIGN KEY (updated_by_platform_user_id) REFERENCES m_platform_user(id);

CREATE TABLE t_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES m_tenant(id),
  actor_type varchar(20) NOT NULL CHECK (actor_type IN ('PLATFORM', 'TENANT', 'SYSTEM')),
  actor_id uuid,
  action varchar(100) NOT NULL,
  entity_type varchar(100),
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id varchar(100),
  created_time timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_log_tenant_time ON t_audit_log (tenant_id, created_time DESC);
CREATE INDEX ix_audit_log_actor_time ON t_audit_log (actor_type, actor_id, created_time DESC);

ALTER TABLE m_user ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);

CREATE INDEX ix_user_tenant ON m_user (tenant_id) WHERE is_deleted = false;
CREATE UNIQUE INDEX uq_user_username_global_active
  ON m_user (lower(username)) WHERE username IS NOT NULL AND is_deleted = false;
CREATE UNIQUE INDEX uq_user_email_global_active
  ON m_user (lower(email)) WHERE email IS NOT NULL AND is_deleted = false;

INSERT INTO m_role (name, code, "desc", is_active, is_deleted)
SELECT 'Admin', 'ADM', 'Administrator tenant', true, false
WHERE NOT EXISTS (
  SELECT 1 FROM m_role WHERE lower(code) = 'adm' AND is_deleted = false
);

INSERT INTO m_platform_role (code, name)
VALUES ('SUPER_ADMIN', 'Super Admin');

INSERT INTO m_platform_permission (code, name)
VALUES
  ('TENANT_READ', 'Melihat tenant'),
  ('TENANT_CREATE', 'Membuat tenant'),
  ('TENANT_UPDATE', 'Memperbarui tenant'),
  ('TENANT_STATUS_UPDATE', 'Mengubah status tenant'),
  ('PLATFORM_AUDIT_READ', 'Melihat audit platform');

INSERT INTO m_platform_role_permission (role_id, permission_id)
SELECT role.id, permission.id
FROM m_platform_role role
CROSS JOIN m_platform_permission permission
WHERE role.code = 'SUPER_ADMIN';
