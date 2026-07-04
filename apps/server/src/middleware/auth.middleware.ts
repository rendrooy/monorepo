import type { AuthTokenPayload } from "@monorepo/types";
import type { Request, RequestHandler } from "express";
import { locales } from "../config";
import { verifyJwt } from "../utils/jwt";
import { runWithAuthContext } from "../utils/request-context";

export interface AuthenticatedRequest extends Request {
    auth?: AuthTokenPayload;
}

export const getAuthPayload = (req: Request) => (req as AuthenticatedRequest).auth;

export const authMiddleware: RequestHandler = (req, res, next) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
        ? authorization.replace("Bearer ", "")
        : null;
    const payload = verifyJwt(token);

    if (!payload) {
        res.status(401).json({
            status: 401,
            message: locales.invalid_access_token,
            data: null,
        });
        return;
    }

    (req as AuthenticatedRequest).auth = payload;
    runWithAuthContext(payload, next);
};
