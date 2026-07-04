import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthTokenPayload } from "@monorepo/types";

interface RequestContext {
    auth?: AuthTokenPayload;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const runWithAuthContext = (auth: AuthTokenPayload, callback: () => void) => {
    requestContextStorage.run({ auth }, callback);
};

export const getCurrentAuth = () => requestContextStorage.getStore()?.auth;
