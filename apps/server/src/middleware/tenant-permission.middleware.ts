import type { RequestHandler } from "express";

import { hasMenuPermission } from "../utils/rbac";

export const requireTenantPermission = (
  menuCode: string,
  permission: number,
): RequestHandler => async (_req, res, next) => {
  try {
    if (!(await hasMenuPermission(menuCode, permission))) {
      res.status(403).json({ data: null, message: "Akses ditolak", status: 403 });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
