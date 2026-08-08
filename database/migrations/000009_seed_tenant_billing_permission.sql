INSERT INTO m_menu
  (name,code,path_url,icon,menu_level,parent_id,sort_order,is_active,is_deleted)
SELECT 'Subscription','PLATFORM_BILLING','subscription','CreditCard','1',NULL,900,true,false
WHERE NOT EXISTS (
  SELECT 1 FROM m_menu WHERE code='PLATFORM_BILLING' AND is_deleted=false
);

INSERT INTO m_role_menu_permission
  (role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT role.id,menu.id,29,true,false
FROM m_role role
INNER JOIN m_menu menu ON menu.code='PLATFORM_BILLING' AND menu.is_deleted=false
WHERE role.code='ADM' AND role.is_deleted=false
  AND NOT EXISTS (
    SELECT 1 FROM m_role_menu_permission permission
    WHERE permission.role_id=role.id AND permission.menu_id=menu.id AND permission.is_deleted=false
  );
