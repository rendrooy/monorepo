import type { BaseRequest, MasterMenuInterface, MasterRoleInterface } from "@monorepo/types";
import type { Request, Response } from "express";

import { getPlatformAuthPayload } from "../middleware/platform-auth.middleware";
import {
  createPlatformMenuService,
  createPlatformRoleService,
  deletePlatformMenuService,
  deletePlatformRoleService,
  getPlatformMenuService,
  getPlatformRoleService,
  loadPlatformMenusService,
  loadPlatformRolesService,
  updatePlatformMenuService,
  updatePlatformRoleService,
} from "../services/platform-access-service";
import { build } from "./app-response";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

const unauthorized = { data: null, message: "Unauthorized", status: 401 };

export const loadPlatformRoles = async (req: RequestBody<BaseRequest<MasterRoleInterface>>, res: Response) =>
  build(res, await loadPlatformRolesService(req.body));
export const getPlatformRole = async (req: RequestBody<MasterRoleInterface>, res: Response) =>
  build(res, await getPlatformRoleService(req.body));
export const createPlatformRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await createPlatformRoleService(auth, req.body) : unauthorized);
};
export const updatePlatformRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await updatePlatformRoleService(auth, req.body) : unauthorized);
};
export const deletePlatformRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await deletePlatformRoleService(auth, req.body) : unauthorized);
};

export const loadPlatformMenus = async (req: RequestBody<BaseRequest<MasterMenuInterface>>, res: Response) =>
  build(res, await loadPlatformMenusService(req.body));
export const getPlatformMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) =>
  build(res, await getPlatformMenuService(req.body));
export const createPlatformMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await createPlatformMenuService(auth, req.body) : unauthorized);
};
export const updatePlatformMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await updatePlatformMenuService(auth, req.body) : unauthorized);
};
export const deletePlatformMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
  const auth = getPlatformAuthPayload(req);
  build(res, auth ? await deletePlatformMenuService(auth, req.body) : unauthorized);
};
