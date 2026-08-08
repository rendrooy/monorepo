import type { AuthTokenPayload } from "@monorepo/types";
import type { Request, RequestHandler } from "express";

import { pool } from "../connection/db";
import { verifyPlatformJwt } from "../utils/jwt";
import { runWithAuthContext } from "../utils/request-context";

export interface PlatformAuthenticatedRequest extends Request {
  platformAuth?: AuthTokenPayload;
}

export const getPlatformAuthPayload = (
  req: Request,
): AuthTokenPayload | undefined =>
  (req as PlatformAuthenticatedRequest).platformAuth;

export const platformAuthMiddleware: RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "")
    : null;
  const payload = verifyPlatformJwt(token);

  if (!payload || payload.identity_type !== "PLATFORM") {
    res
      .status(401)
      .json({ data: null, message: "Token platform tidak valid", status: 401 });
    return;
  }

  (req as PlatformAuthenticatedRequest).platformAuth = payload;
  runWithAuthContext(payload, next);
};

export const requirePlatformPermission =
  (permissionCode: string): RequestHandler =>
  async (req, res, next) => {
    const auth = getPlatformAuthPayload(req);
    if (!auth?.role_id) {
      res.status(403).json({
        data: null,
        message: "Permission platform tidak tersedia",
        status: 403,
      });
      return;
    }

    const result = await pool.query(
      `SELECT 1
       FROM m_platform_role_permission role_permission
       INNER JOIN m_platform_role role ON role.id=role_permission.role_id
       INNER JOIN m_platform_permission permission ON permission.id=role_permission.permission_id
       WHERE role_permission.role_id=$1 AND permission.code=$2
         AND role.is_active=true AND role.is_deleted=false
         AND permission.is_active=true AND permission.is_deleted=false
       LIMIT 1`,
      [auth.role_id, permissionCode],
    );

    if (!result.rowCount) {
      res
        .status(403)
        .json({ data: null, message: "Akses platform ditolak", status: 403 });
      return;
    }

    next();
  };
