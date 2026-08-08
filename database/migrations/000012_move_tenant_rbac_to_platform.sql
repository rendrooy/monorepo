INSERT INTO m_platform_permission (code,name)
SELECT seed.code,seed.name
FROM (VALUES
  ('TENANT_ROLE_READ','Melihat template role tenant'),
  ('TENANT_ROLE_MANAGE','Mengelola template role tenant'),
  ('TENANT_MENU_READ','Melihat menu aplikasi tenant'),
  ('TENANT_MENU_MANAGE','Mengelola menu aplikasi tenant')
) AS seed(code,name)
WHERE NOT EXISTS (
  SELECT 1 FROM m_platform_permission permission
  WHERE lower(permission.code)=lower(seed.code) AND permission.is_deleted=false
);

INSERT INTO m_platform_role_permission (role_id,permission_id)
SELECT role.id,permission.id
FROM m_platform_role role
CROSS JOIN m_platform_permission permission
WHERE role.code='SUPER_ADMIN'
  AND permission.code IN (
    'TENANT_ROLE_READ','TENANT_ROLE_MANAGE','TENANT_MENU_READ','TENANT_MENU_MANAGE'
  )
ON CONFLICT (role_id,permission_id) DO NOTHING;

UPDATE m_role_menu_permission permission
SET is_active=false,is_deleted=true,updated_time=now()
FROM m_menu menu
WHERE permission.menu_id=menu.id
  AND permission.is_deleted=false
  AND trim(BOTH '/' FROM lower(menu.path_url)) IN ('master/role','master/menu');
