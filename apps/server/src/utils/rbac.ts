import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "./request-context";

export const PERMISSION = { READ: 1, ACTION: 4, EDIT: 8, ADD: 16, DELETE: 32 } as const;

export const hasMenuPermission = async (menuCode: string, permissionBit: number) => {
  const roleId = getCurrentAuth()?.role_id;
  if (!roleId) return false;
  const result = await pool.query(
    `SELECT 1 FROM ${tableNames.masterRoleMenuPermission} permission
     INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id
     WHERE permission.role_id=$1 AND menu.code=$2
       AND permission.is_active=true AND permission.is_deleted=false
       AND menu.is_active=true AND menu.is_deleted=false
       AND (permission.permission_mask & $3)=$3 LIMIT 1`,
    [roleId, menuCode, permissionBit],
  );
  return Boolean(result.rowCount);
};
