import { createUserService, deleteUserService, getUserService, loadUserService, updateUserService } from "../services/master-user-service";
import type { BaseRequest, MasterUserInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const getUser = async (req: RequestBody<MasterUserInterface>, res: Response) => {
    build(res, await getUserService(req.body));
};
export const loadUser = async (req: RequestBody<BaseRequest<MasterUserInterface>>, res: Response) => {
    build(res, await loadUserService(req.body));
};
export const createUser = async (req: RequestBody<MasterUserInterface>, res: Response) => {
    build(res, await createUserService(req.body));
};
export const updateUser = async (req: RequestBody<MasterUserInterface>, res: Response) => {
    build(res, await updateUserService(req.body));
};
export const deleteUser = async (req: RequestBody<MasterUserInterface>, res: Response) => {
    build(res, await deleteUserService(req.body));
};
