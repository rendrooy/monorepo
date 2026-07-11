-- Struktur menu Phase 2:
-- IPL > Generate Bill, Verifikasi Payment (ADMIN)
-- Operation > Tagihan (WARGA)

INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'IPL', 'IPL', 'ipl', 'ReceiptText', 1, NULL, 30, true, false
WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false LIMIT 1)
INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'Generate Bill', 'OP_IPL', 'generate-bill', 'FilePlus2', 2, parent.id, 1, true, false
FROM parent WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'OP_IPL' AND is_deleted = false);

UPDATE homehub_revamp.m_menu SET name = 'Generate Bill', path_url = 'generate-bill', menu_level = 2,
  parent_id = (SELECT id FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false LIMIT 1), updated_time = now()
WHERE code = 'OP_IPL' AND is_deleted = false;

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false LIMIT 1)
INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'Verifikasi Payment', 'IPL_PAYMENT_VERIFY', 'verifikasi-payment', 'BadgeCheck', 2, parent.id, 2, true, false
FROM parent WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'IPL_PAYMENT_VERIFY' AND is_deleted = false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false LIMIT 1)
INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'Laporan IPL', 'IPL_REPORT', 'report', 'ChartNoAxesCombined', 2, parent.id, 3, true, false
FROM parent WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'IPL_REPORT' AND is_deleted = false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code = 'OPERATION' AND is_deleted = false LIMIT 1)
INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'Tagihan', 'OP_BILL', 'tagihan', 'Receipt', 2, parent.id, 20, true, false
FROM parent WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'OP_BILL' AND is_deleted = false);

UPDATE homehub_revamp.m_menu SET name = 'Tagihan', path_url = 'tagihan', menu_level = 2,
  parent_id = (SELECT id FROM homehub_revamp.m_menu WHERE code = 'OPERATION' AND is_deleted = false LIMIT 1), updated_time = now()
WHERE code = 'OP_BILL' AND is_deleted = false;

INSERT INTO homehub_revamp.m_role_menu_permission (role_id, menu_id, permission_mask, is_active, is_deleted)
SELECT role.id, menu.id, 1, true, false FROM homehub_revamp.m_role role
JOIN homehub_revamp.m_menu menu ON menu.code = 'IPL'
WHERE role.code = 'ADMIN' AND role.is_deleted = false AND NOT EXISTS (
  SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id = role.id AND p.menu_id = menu.id AND p.is_deleted = false
);

INSERT INTO homehub_revamp.m_role_menu_permission (role_id, menu_id, permission_mask, is_active, is_deleted)
SELECT role.id, menu.id, 63, true, false FROM homehub_revamp.m_role role
JOIN homehub_revamp.m_menu menu ON menu.code IN ('OP_IPL', 'IPL_PAYMENT_VERIFY', 'IPL_REPORT')
WHERE role.code = 'ADMIN' AND role.is_deleted = false AND NOT EXISTS (
  SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id = role.id AND p.menu_id = menu.id AND p.is_deleted = false
);

INSERT INTO homehub_revamp.m_role_menu_permission (role_id, menu_id, permission_mask, is_active, is_deleted)
SELECT role.id, menu.id, 5, true, false FROM homehub_revamp.m_role role
JOIN homehub_revamp.m_menu menu ON menu.code = 'OP_BILL'
WHERE role.code IN ('WARGA', 'WRG') AND role.is_deleted = false AND NOT EXISTS (
  SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id = role.id AND p.menu_id = menu.id AND p.is_deleted = false
);

UPDATE homehub_revamp.m_role_menu_permission permission SET permission_mask = 5, updated_time = now()
FROM homehub_revamp.m_role role, homehub_revamp.m_menu menu
WHERE permission.role_id = role.id AND permission.menu_id = menu.id
  AND role.code IN ('WARGA', 'WRG') AND menu.code = 'OP_BILL' AND permission.is_deleted = false;

-- Bersihkan akses parent IPL warga dari struktur menu versi Phase 1.
UPDATE homehub_revamp.m_role_menu_permission permission SET is_deleted = true, updated_time = now()
FROM homehub_revamp.m_role role, homehub_revamp.m_menu menu
WHERE permission.role_id = role.id AND permission.menu_id = menu.id
  AND role.code IN ('WARGA', 'WRG') AND menu.code = 'IPL' AND permission.is_deleted = false;
