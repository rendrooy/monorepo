-- Operation > UMKM Saya (WRG)
WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='OPERATION' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'UMKM Saya','OP_UMKM','umkm','Store',2,parent.id,30,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='OP_UMKM' AND is_deleted=false);

-- UMKM > Verifikasi Konten (KRT/KRW/SDM)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'UMKM','UMKM','umkm','Store',1,NULL,40,true,false
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='UMKM' AND is_deleted=false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='UMKM' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Verifikasi Konten','UMKM_CONTENT_REVIEW','verifikasi-content','BadgeCheck',2,parent.id,1,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='UMKM_CONTENT_REVIEW' AND is_deleted=false);

-- Warga: READ + ADD + EDIT + ACTION pada UMKM sendiri.
INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,29,true,false FROM homehub_revamp.m_role role JOIN homehub_revamp.m_menu menu ON menu.code='OP_UMKM'
WHERE role.code='WRG' AND role.is_deleted=false AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

-- Parent UMKM readable untuk reviewer.
INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,1,true,false FROM homehub_revamp.m_role role JOIN homehub_revamp.m_menu menu ON menu.code='UMKM'
WHERE role.code IN('KRT','KRW','SDM') AND role.is_deleted=false AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

-- KRT/KRW memiliki READ + ACTION; SDM seluruh permission.
INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,CASE WHEN role.code='SDM' THEN 63 ELSE 5 END,true,false
FROM homehub_revamp.m_role role JOIN homehub_revamp.m_menu menu ON menu.code='UMKM_CONTENT_REVIEW'
WHERE role.code IN('KRT','KRW','SDM') AND role.is_deleted=false AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

-- Sinkronkan permission bila script dijalankan ulang dan record sebelumnya sudah ada.
UPDATE homehub_revamp.m_role_menu_permission permission
SET permission_mask = CASE WHEN role.code='SDM' THEN 63 ELSE 5 END,
    is_active = true,
    is_deleted = false,
    updated_time = now()
FROM homehub_revamp.m_role role, homehub_revamp.m_menu menu
WHERE permission.role_id=role.id
  AND permission.menu_id=menu.id
  AND role.code IN('KRT','KRW','SDM')
  AND menu.code='UMKM_CONTENT_REVIEW'
  AND role.is_deleted=false
  AND menu.is_deleted=false;

-- Phase 2: master paket dan verifikasi pembayaran.
INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,1,true,false FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code='BDR' AND menu.code='UMKM' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='UMKM' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Paket Subscription','UMKM_SUBSCRIPTION_PLAN','paket-subscription','Package',2,parent.id,2,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='UMKM_SUBSCRIPTION_PLAN' AND is_deleted=false);

WITH parent AS (SELECT id FROM homehub_revamp.m_menu WHERE code='UMKM' AND is_deleted=false LIMIT 1)
INSERT INTO homehub_revamp.m_menu(name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Verifikasi Pembayaran','UMKM_PAYMENT_REVIEW','verifikasi-pembayaran','ReceiptText',2,parent.id,3,true,false FROM parent
WHERE NOT EXISTS(SELECT 1 FROM homehub_revamp.m_menu WHERE code='UMKM_PAYMENT_REVIEW' AND is_deleted=false);

INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,CASE WHEN role.code='SDM' THEN 63 ELSE 25 END,true,false
FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code IN('BDR','SDM') AND menu.code='UMKM_SUBSCRIPTION_PLAN' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

INSERT INTO homehub_revamp.m_role_menu_permission(role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,CASE WHEN role.code='SDM' THEN 63 ELSE 5 END,true,false
FROM homehub_revamp.m_role role CROSS JOIN homehub_revamp.m_menu menu
WHERE role.code IN('BDR','SDM') AND menu.code='UMKM_PAYMENT_REVIEW' AND role.is_deleted=false
AND NOT EXISTS(SELECT 1 FROM homehub_revamp.m_role_menu_permission p WHERE p.role_id=role.id AND p.menu_id=menu.id AND p.is_deleted=false);

-- Pastikan permission Phase 2 tetap sinkron ketika script dijalankan ulang.
UPDATE homehub_revamp.m_role_menu_permission permission
SET permission_mask=CASE
        WHEN role.code='SDM' THEN 63
        WHEN menu.code='UMKM_SUBSCRIPTION_PLAN' THEN 25
        ELSE 5
    END,
    is_active=true,
    is_deleted=false,
    updated_time=now()
FROM homehub_revamp.m_role role,homehub_revamp.m_menu menu
WHERE permission.role_id=role.id AND permission.menu_id=menu.id
  AND role.code IN('BDR','SDM')
  AND menu.code IN('UMKM_SUBSCRIPTION_PLAN','UMKM_PAYMENT_REVIEW')
  AND role.is_deleted=false AND menu.is_deleted=false;
