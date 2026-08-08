import type {
  CreateTenantRequest,
  BaseRequest,
  PlatformTenantStatusRequest,
  PlatformLoginRequest,
} from "@monorepo/types";
import type { Request, Response } from "express";

import { getPlatformAuthPayload } from "../middleware/platform-auth.middleware";
import {
  createTenantService,
  getPlatformTenantService,
  loadPlatformAuditService,
  loadPlatformTenantsService,
  platformLoginService,
  updatePlatformTenantStatusService,
} from "../services/platform-service";
import { build } from "./app-response";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const platformLogin = async (
  req: RequestBody<PlatformLoginRequest>,
  res: Response,
) => {
  build(res, await platformLoginService(req.body));
};

export const createTenant = async (
  req: RequestBody<CreateTenantRequest>,
  res: Response,
) => {
  const auth = getPlatformAuthPayload(req);
  if (!auth) {
    build(res, { data: null, message: "Unauthorized", status: 401 });
    return;
  }

  build(res, await createTenantService(auth, req.body));
};

export const loadPlatformTenants = async (req: RequestBody<BaseRequest>, res: Response) =>
  build(res, await loadPlatformTenantsService(req.body));

export const getPlatformTenant = async (req: RequestBody<{ tenant_id?: string }>, res: Response) =>
  build(res, await getPlatformTenantService(req.body.tenant_id));

export const updatePlatformTenantStatus = async (
  req: RequestBody<PlatformTenantStatusRequest>,
  res: Response,
) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await updatePlatformTenantStatusService(auth, req.body) : { data: null, message: "Unauthorized", status: 401 });
};

export const loadPlatformAudit = async (req: RequestBody<BaseRequest>, res: Response) =>
  build(res, await loadPlatformAuditService(req.body));
