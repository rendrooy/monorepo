import {
    createRoleService,
    deleteRoleService,
    getRoleService,
    loadRoleService,
    updateRoleService
} from "../services/master-role-service";
import type { BaseRequest, MasterRoleInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const getRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
    build(res, await getRoleService(req.body));
};
export const loadRole = async (req: RequestBody<BaseRequest<MasterRoleInterface>>, res: Response) => {
    build(res, await loadRoleService(req.body));
};
export const createRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
    build(res, await createRoleService(req.body));
};
export const updateRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
    build(res, await updateRoleService(req.body));
};
export const deleteRole = async (req: RequestBody<MasterRoleInterface>, res: Response) => {
    build(res, await deleteRoleService(req.body));
};
