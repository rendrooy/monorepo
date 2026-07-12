import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthTokenPayload } from "@monorepo/types";

interface RequestContext {
    auth?: AuthTokenPayload;
    requestId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithAuthContext = (auth: AuthTokenPayload, callback: () => void) => {
    requestContextStorage.run({ ...requestContextStorage.getStore(), auth }, callback);
};

export const getCurrentAuth = () => requestContextStorage.getStore()?.auth;
export const getRequestContext = () => requestContextStorage.getStore();
export const runWithRequestContext = (requestId: string, callback: () => void) =>
    requestContextStorage.run({ requestId }, callback);
