import type { AuthMenuTreeInterface, AuthUserInterface } from "@monorepo/types";

const ACCESS_TOKEN_KEY = "homehub_access_token";
const AUTH_USER_KEY = "homehub_auth_user";
const AUTH_MENU_KEY = "homehub_auth_menu";
export const AUTH_SESSION_CLEARED_EVENT = "homehub_auth_session_cleared";

const isBrowser = () => typeof window !== "undefined";

export const getAccessToken = () => {
    if (!isBrowser()) {
        return null;
    }

    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string) => {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const getAuthUser = (): AuthUserInterface | null => {
    if (!isBrowser()) {
        return null;
    }

    const user = window.localStorage.getItem(AUTH_USER_KEY);
    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user) as AuthUserInterface;
    } catch {
        return null;
    }
};

export const setAuthUser = (user: AuthUserInterface) => {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getAuthMenu = (): AuthMenuTreeInterface[] => {
    if (!isBrowser()) {
        return [];
    }

    const menu = window.localStorage.getItem(AUTH_MENU_KEY);
    if (!menu) {
        return [];
    }

    try {
        return JSON.parse(menu) as AuthMenuTreeInterface[];
    } catch {
        return [];
    }
};

export const setAuthMenu = (menu: AuthMenuTreeInterface[]) => {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.setItem(AUTH_MENU_KEY, JSON.stringify(menu));
};

export const clearAuthSession = () => {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_MENU_KEY);
    window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
};
