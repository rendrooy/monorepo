import type { AuthLoginRequest, AuthRegisterRequest } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import { getAuthPayload } from "../middleware/auth.middleware";
import { authMenuService, loginService, meService, registerService } from "../services/auth-service";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const login = async (req: RequestBody<AuthLoginRequest>, res: Response) => {
    build(res, await loginService(req.body));
};

export const register = async (req: RequestBody<AuthRegisterRequest>, res: Response) => {
    build(res, await registerService(req.body));
};

export const me = async (req: Request, res: Response) => {
    const auth = getAuthPayload(req);
    if (!auth) {
        build(res, { status: 401, message: "Unauthorized", data: null });
        return;
    }

    build(res, await meService(auth));
};

export const authMenu = async (req: Request, res: Response) => {
    const auth = getAuthPayload(req);
    if (!auth) {
        build(res, { status: 401, message: "Unauthorized", data: null });
        return;
    }

    build(res, await authMenuService(auth));
};
