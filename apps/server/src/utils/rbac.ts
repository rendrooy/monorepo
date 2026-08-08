import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "./request-context";

export const PERMISSION = { READ: 1, ACTION: 4, EDIT: 8, ADD: 16, DELETE: 32 } as const;

const MENU_CODE_ALIASES: Record<string, string[]> = {
  IPL_PAYMENT_VERIFY: ["IPL_PAYMENT_VERIFY", "2200"],
  IPL_REPORT: ["IPL_REPORT", "2300"],
  OP_BILL: ["OP_BILL", "4200"],
  OP_GUEST_REPORT: ["OP_GUEST_REPORT", "4400"],
  OP_IPL: ["OP_IPL", "2100"],
  OP_UMKM: ["OP_UMKM", "4300"],
  SECURITY_GUEST_GATE: ["SECURITY_GUEST_GATE", "6100"],
  SECURITY_GUEST_HISTORY: ["SECURITY_GUEST_HISTORY", "6200"],
  UMKM_CONTENT_REVIEW: ["UMKM_CONTENT_REVIEW", "5100"],
  UMKM_PAYMENT_REVIEW: ["UMKM_PAYMENT_REVIEW", "5300"],
  UMKM_SUBSCRIPTION_PLAN: ["UMKM_SUBSCRIPTION_PLAN", "5200"],
};

export const hasMenuPermission = async (menuCode: string, permissionBit: number) => {
  const roleId = getCurrentAuth()?.role_id;
  if (!roleId) return false;
  const menuCodes = MENU_CODE_ALIASES[menuCode] || [menuCode];
  const result = await pool.query(
    `SELECT 1 FROM ${tableNames.masterRoleMenuPermission} permission
     INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id
     WHERE permission.role_id=$1 AND menu.code=ANY($2::text[])
       AND permission.is_active=true AND permission.is_deleted=false
       AND menu.is_active=true AND menu.is_deleted=false
       AND (permission.permission_mask & $3)=$3 LIMIT 1`,
    [roleId, menuCodes, permissionBit],
  );
  return Boolean(result.rowCount);
};
