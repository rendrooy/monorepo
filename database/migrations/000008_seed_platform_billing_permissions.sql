INSERT INTO m_platform_permission (code,name)
SELECT seed.code,seed.name
FROM (VALUES
  ('PLATFORM_PLAN_MANAGE','Mengelola paket platform'),
  ('PLATFORM_BILLING_READ','Melihat billing tenant'),
  ('PLATFORM_PAYMENT_REVIEW','Memverifikasi pembayaran subscription'),
  ('PLATFORM_SUBSCRIPTION_MANAGE','Mengelola subscription tenant')
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
    'PLATFORM_PLAN_MANAGE',
    'PLATFORM_BILLING_READ',
    'PLATFORM_PAYMENT_REVIEW',
    'PLATFORM_SUBSCRIPTION_MANAGE'
  )
ON CONFLICT (role_id,permission_id) DO NOTHING;
