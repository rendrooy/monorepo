-- ADM is the tenant-scoped administrator. It follows the SDM permission
-- template, while runtime tenant isolation and plan entitlement remain active.
INSERT INTO m_role_menu_permission
  (role_id,menu_id,permission_mask,is_active,is_deleted)
SELECT admin_role.id,template.menu_id,template.permission_mask,true,false
FROM m_role admin_role
CROSS JOIN m_role template_role
INNER JOIN m_role_menu_permission template
  ON template.role_id=template_role.id
  AND template.is_active=true
  AND template.is_deleted=false
INNER JOIN m_menu menu
  ON menu.id=template.menu_id
  AND menu.is_active=true
  AND menu.is_deleted=false
WHERE admin_role.code='ADM'
  AND admin_role.is_deleted=false
  AND template_role.code='SDM'
  AND template_role.is_deleted=false
  AND NOT EXISTS (
    SELECT 1 FROM m_role_menu_permission permission
    WHERE permission.role_id=admin_role.id
      AND permission.menu_id=template.menu_id
      AND permission.is_deleted=false
  );

UPDATE m_role_menu_permission permission
SET permission_mask=template.permission_mask,
    is_active=true,
    updated_time=now()
FROM m_role admin_role,m_role template_role,m_role_menu_permission template
WHERE permission.role_id=admin_role.id
  AND template.role_id=template_role.id
  AND template.menu_id=permission.menu_id
  AND admin_role.code='ADM'
  AND template_role.code='SDM'
  AND admin_role.is_deleted=false
  AND template_role.is_deleted=false
  AND template.is_active=true
  AND template.is_deleted=false
  AND permission.is_deleted=false;
