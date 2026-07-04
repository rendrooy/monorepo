import {
    createMenuService,
    deleteMenuService,
    getMenuService,
    loadMenuService,
    updateMenuService,
} from "../services/master-menu-service";
import type { BaseRequest, MasterMenuInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const getMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
    build(res, await getMenuService(req.body));
};

export const loadMenu = async (req: RequestBody<BaseRequest<MasterMenuInterface>>, res: Response) => {
    build(res, await loadMenuService(req.body));
};

export const createMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
    build(res, await createMenuService(req.body));
};

export const updateMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
    build(res, await updateMenuService(req.body));
};

export const deleteMenu = async (req: RequestBody<MasterMenuInterface>, res: Response) => {
    build(res, await deleteMenuService(req.body));
};
