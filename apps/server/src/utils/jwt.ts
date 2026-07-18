import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthTokenPayload } from "@monorepo/types";
import { jwtConfig } from "../config";

const JWT_SECRET = jwtConfig.secret;
const DEFAULT_EXPIRES_IN_SECONDS = jwtConfig.expiresInSeconds;

const encodeBase64Url = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

const signValue = (value: string) =>
    createHmac("sha256", JWT_SECRET!).update(value).digest("base64url");

export const signJwt = (
    payload: Omit<AuthTokenPayload, "iat" | "exp">,
    expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS,
) => {
    const now = Math.floor(Date.now() / 1000);
    const header = encodeBase64Url({ alg: "HS256", typ: "JWT" });
    const body = encodeBase64Url({
        ...payload,
        iat: now,
        exp: now + expiresInSeconds,
    });
    const signature = signValue(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
};

export const verifyJwt = (token?: string | null): AuthTokenPayload | null => {
    if (!token) {
        return null;
    }

    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) {
        return null;
    }

    const expectedSignature = signValue(`${header}.${body}`);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
};
