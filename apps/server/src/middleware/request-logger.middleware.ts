import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import pinoHttp from "pino-http";
import { logger } from "../config/logger";
import { runWithRequestContext } from "../utils/request-context";

export const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps(req: Request & { auth?: { user_id?: string; role_code?: string; tenant_id?: string | null } }) {
    return req.auth
      ? { userId: req.auth.user_id, roleCode: req.auth.role_code, tenantId: req.auth.tenant_id }
      : {};
  },
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
});

export const requestContextMiddleware: RequestHandler = (req: Request, _res: Response, next: NextFunction) =>
  runWithRequestContext(String(req.id || randomUUID()), next);
