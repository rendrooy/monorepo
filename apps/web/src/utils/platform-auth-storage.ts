import type { PlatformUserInterface } from "@monorepo/types";

const TOKEN_KEY = "homehub_platform_access_token";
const USER_KEY = "homehub_platform_user";

const browser = () => typeof window !== "undefined";

export const getPlatformToken = () => browser() ? localStorage.getItem(TOKEN_KEY) : null;
export const setPlatformSession = (token: string, user: PlatformUserInterface) => {
  if (!browser()) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const getPlatformUser = (): PlatformUserInterface | null => {
  if (!browser()) return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
};
export const clearPlatformSession = () => {
  if (!browser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
