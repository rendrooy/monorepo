import type {
  AuthTokenPayload,
  BaseRequest,
  MasterMenuInterface,
  MasterRoleInterface,
} from "@monorepo/types";

import { tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import {
  createMenuService,
  deleteMenuService,
  getMenuService,
  loadMenuService,
  updateMenuService,
} from "./master-menu-service";
import {
  createRoleService,
  deleteRoleService,
  getRoleService,
  loadRoleService,
  updateRoleService,
} from "./master-role-service";

const recordPlatformAudit = async (
  auth: AuthTokenPayload,
  action: string,
  entityType: string,
  entityId: null | string | undefined,
  metadata: Record<string, unknown>,
) => {
  try {
    await pool.query(
      `INSERT INTO ${tableNames.auditLog}
       (actor_type,actor_id,action,entity_type,entity_id,metadata)
       VALUES ('PLATFORM',$1,$2,$3,$4,$5::jsonb)`,
      [auth.user_id, action, entityType, entityId || null, JSON.stringify(metadata)],
    );
  } catch (error) {
    logger.error({ action, entityId, err: error }, "Platform RBAC audit failed");
  }
};

const sanitizeTenantRolePermissions = async (request: MasterRoleInterface) => {
  const allowedMenus = await pool.query<{
    id: string;
    menu_level: number;
    parent_id: null | string;
    path_url: null | string;
  }>(
    `SELECT id,menu_level,parent_id,path_url FROM ${tableNames.masterMenu}
     WHERE is_active=true AND is_deleted=false
       AND trim(BOTH '/' FROM lower(path_url)) NOT IN ('master/role','master/menu')
     ORDER BY menu_level,sort_order`,
  );
  const allowedIds = new Set(allowedMenus.rows.map((menu) => menu.id));
  const permissions = request.role_permissions?.length
    ? request.role_permissions.filter((permission) => permission.menu_id && allowedIds.has(permission.menu_id))
    : allowedMenus.rows.map((menu) => ({
      is_active: true,
      menu_id: menu.id,
      menu_level: menu.menu_level,
      parent_id: menu.parent_id,
      path_url: menu.path_url,
      permission_mask: 0,
    }));
  return { ...request, role_permissions: permissions };
};

export const loadPlatformRolesService = (request: BaseRequest<MasterRoleInterface>) =>
  loadRoleService(request);

export const getPlatformRoleService = (request: MasterRoleInterface) =>
  getRoleService(request);

export const createPlatformRoleService = async (
  auth: AuthTokenPayload,
  request: MasterRoleInterface,
) => {
  const response = await createRoleService(await sanitizeTenantRolePermissions(request));
  if (response.status < 400) {
    await recordPlatformAudit(auth, "TENANT_ROLE_CREATE", "TENANT_ROLE", response.data?.id, {
      code: request.code,
      name: request.name,
    });
  }
  return response;
};

export const updatePlatformRoleService = async (
  auth: AuthTokenPayload,
  request: MasterRoleInterface,
) => {
  const response = await updateRoleService(await sanitizeTenantRolePermissions(request));
  if (response.status < 400) {
    await recordPlatformAudit(auth, "TENANT_ROLE_UPDATE", "TENANT_ROLE", request.id, {
      code: request.code,
      name: request.name,
    });
  }
  return response;
};

export const deletePlatformRoleService = async (
  auth: AuthTokenPayload,
  request: MasterRoleInterface,
) => {
  if (!request.id) return { data: null, message: "Role wajib dipilih", status: 400 };
  const usage = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM ${tableNames.masterUser}
     WHERE role_id=$1 AND is_deleted=false`,
    [request.id],
  );
  if ((usage.rows[0]?.total || 0) > 0) {
    return { data: null, message: "Role masih digunakan oleh user tenant", status: 409 };
  }
  const response = await deleteRoleService(request);
  if (response.status < 400) {
    await recordPlatformAudit(auth, "TENANT_ROLE_DELETE", "TENANT_ROLE", request.id, {});
  }
  return response;
};

export const loadPlatformMenusService = (request: BaseRequest<MasterMenuInterface>) =>
  loadMenuService(request);

export const getPlatformMenuService = (request: MasterMenuInterface) =>
  getMenuService(request);

export const createPlatformMenuService = async (
  auth: AuthTokenPayload,
  request: MasterMenuInterface,
) => {
  const response = await createMenuService(request);
  if (response.status < 400) {
    await recordPlatformAudit(auth, "TENANT_MENU_CREATE", "TENANT_MENU", response.data?.id, {
      code: request.code,
      path_url: request.path_url,
    });
  }
  return response;
};

export const updatePlatformMenuService = async (
  auth: AuthTokenPayload,
  request: MasterMenuInterface,
) => {
  const response = await updateMenuService(request);
  if (response.status < 400) {
    await recordPlatformAudit(auth, "TENANT_MENU_UPDATE", "TENANT_MENU", request.id, {
      code: request.code,
      path_url: request.path_url,
    });
  }
  return response;
};

export const deletePlatformMenuService = async (
  auth: AuthTokenPayload,
  request: MasterMenuInterface,
) => {
  if (!request.id) return { data: null, message: "Menu wajib dipilih", status: 400 };
  const children = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM ${tableNames.masterMenu}
     WHERE parent_id=$1 AND is_deleted=false`,
    [request.id],
  );
  if ((children.rows[0]?.total || 0) > 0) {
    return { data: null, message: "Menu masih memiliki submenu aktif", status: 409 };
  }
  const response = await deleteMenuService(request);
  if (response.status < 400) {
    await recordPlatformAudit(auth, "TENANT_MENU_DELETE", "TENANT_MENU", request.id, {});
  }
  return response;
};
