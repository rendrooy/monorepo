-- Jalankan setelah menu induk OPERATION dan role ADMIN/WARGA tersedia.
WITH operation_menu AS (
  SELECT id FROM homehub_revamp.m_menu WHERE code = 'OPERATION' AND is_deleted = false LIMIT 1
)
INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'IPL Billing', 'OP_IPL', 'ipl', 'ReceiptText', 2, operation_menu.id, 20, true, false
FROM operation_menu
WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'OP_IPL' AND is_deleted = false);

INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'IPL', 'IPL', 'ipl', 'ReceiptText', 1, NULL, 30, true, false
WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false);

WITH ipl_menu AS (
  SELECT id FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false LIMIT 1
)
INSERT INTO homehub_revamp.m_menu
  (name, code, path_url, icon, menu_level, parent_id, sort_order, is_active, is_deleted)
SELECT 'Tagihan IPL', 'OP_BILL', 'bill', 'Receipt', 2, ipl_menu.id, 1, true, false
FROM ipl_menu
WHERE NOT EXISTS (SELECT 1 FROM homehub_revamp.m_menu WHERE code = 'OP_BILL' AND is_deleted = false);

-- Memindahkan OP_BILL bila script versi awal sudah pernah dijalankan.
UPDATE homehub_revamp.m_menu
SET parent_id = (SELECT id FROM homehub_revamp.m_menu WHERE code = 'IPL' AND is_deleted = false LIMIT 1),
    path_url = 'bill', menu_level = 2, updated_time = now()
WHERE code = 'OP_BILL' AND is_deleted = false;

-- ADMIN mendapat seluruh aksi (63), WARGA hanya READ (1).
INSERT INTO homehub_revamp.m_role_menu_permission
  (role_id, menu_id, permission_mask, is_active, is_deleted)
SELECT role.id, menu.id, 63, true, false
FROM homehub_revamp.m_role role
JOIN homehub_revamp.m_menu menu ON menu.code = 'OP_IPL'
WHERE role.code = 'ADMIN' AND role.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM homehub_revamp.m_role_menu_permission permission
    WHERE permission.role_id = role.id AND permission.menu_id = menu.id AND permission.is_deleted = false
  );

INSERT INTO homehub_revamp.m_role_menu_permission
  (role_id, menu_id, permission_mask, is_active, is_deleted)
SELECT role.id, menu.id, 1, true, false
FROM homehub_revamp.m_role role
JOIN homehub_revamp.m_menu menu ON menu.code = 'OP_BILL'
WHERE role.code IN ('WARGA', 'WRG') AND role.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM homehub_revamp.m_role_menu_permission permission
    WHERE permission.role_id = role.id AND permission.menu_id = menu.id AND permission.is_deleted = false
  );

-- Parent IPL juga harus readable agar submenu Bill masuk ke menu tree warga.
INSERT INTO homehub_revamp.m_role_menu_permission
  (role_id, menu_id, permission_mask, is_active, is_deleted)
SELECT role.id, menu.id, 1, true, false
FROM homehub_revamp.m_role role
JOIN homehub_revamp.m_menu menu ON menu.code = 'IPL'
WHERE role.code IN ('WARGA', 'WRG') AND role.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM homehub_revamp.m_role_menu_permission permission
    WHERE permission.role_id = role.id AND permission.menu_id = menu.id AND permission.is_deleted = false
  );
