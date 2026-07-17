-- Provisioning role awal. Runtime tidak memeriksa code/name role ini.
UPDATE homehub_revamp.m_role SET name='Satuan Pengamanan',is_active=true,is_deleted=false,updated_time=now()
WHERE code='STPM';
INSERT INTO homehub_revamp.m_role(name,code,"desc",is_active,is_deleted)
SELECT 'Satuan Pengamanan','STPM','Petugas keamanan lingkungan',true,false
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role WHERE code='STPM');

-- Laporan milik warga berada di bawah Operation.
WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='OPERATION' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Laporan Tamu','OP_GUEST_REPORT','guest','ClipboardList',2,parent.id,40,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='OP_GUEST_REPORT' AND is_deleted=false);

-- Operasional gerbang menggunakan permission, bukan pemeriksaan role di aplikasi.
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Keamanan','SECURITY','security','ShieldCheck',1,NULL,50,true,false
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='SECURITY' AND is_deleted=false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='SECURITY' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Gerbang Tamu','SECURITY_GUEST_GATE','guest-gate','ScanLine',2,parent.id,1,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='SECURITY_GUEST_GATE' AND is_deleted=false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='SECURITY' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Riwayat Kunjungan','SECURITY_GUEST_HISTORY','guest-history','History',2,parent.id,2,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='SECURITY_GUEST_HISTORY' AND is_deleted=false);

-- Default assignment dapat diubah melalui master role; runtime hanya membaca permission mask.
INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,CASE WHEN role.code='SDM' THEN 63 ELSE 29 END,true,false
FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code IN('WRG','SDM') AND menu.code='OP_GUEST_REPORT' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,1,true,false FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code IN('STPM','SDM') AND menu.code='SECURITY' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,CASE WHEN role.code='SDM' THEN 63 ELSE 5 END,true,false
FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code IN('STPM','SDM') AND menu.code='SECURITY_GUEST_GATE' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,CASE WHEN role.code='SDM' THEN 63 ELSE 1 END,true,false
FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code IN('STPM','SDM') AND menu.code='SECURITY_GUEST_HISTORY' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);
