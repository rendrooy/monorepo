import type { AuthMenuTreeInterface } from "@monorepo/types";

export const PERMISSION_BITS = {
    DELETE: 1 << 5,
    ADD: 1 << 4,
    EDIT: 1 << 3,
    ACTION: 1 << 2,
    DOWNLOAD: 1 << 1,
    READ: 1 << 0,
} as const;

export type PermissionAction = keyof typeof PERMISSION_BITS;

export const hasPermission = (
    access?: string | number | null,
    action: PermissionAction = "READ",
) => (Number(access || 0) & PERMISSION_BITS[action]) === PERMISSION_BITS[action];

export const normalizePermissionPath = (path?: string | null) =>
    (path || "").replace(/^\/+/, "").replace(/\/+$/, "");

export const joinPermissionPath = (parent?: string | null, child?: string | null) => {
    const parentPath = normalizePermissionPath(parent);
    const childPath = normalizePermissionPath(child);

    if (!parentPath) return childPath;
    if (!childPath) return parentPath;
    if (childPath === parentPath || childPath.startsWith(`${parentPath}/`)) {
        return childPath;
    }

    return `${parentPath}/${childPath}`;
};

export const canAccessRoute = (
    menus: AuthMenuTreeInterface[],
    route: string,
    action: PermissionAction = "READ",
) => {
    const normalizedRoute = normalizePermissionPath(route);

    return menus.some((menu) => {
        const menuPath = normalizePermissionPath(menu.pathUrl);
        const childHasAccess = menu.child.some((child) => {
            if (!hasPermission(child.access, action)) {
                return false;
            }

            const childPath = joinPermissionPath(menu.pathUrl, child.pathUrl);
            return normalizedRoute === childPath || normalizedRoute.startsWith(`${childPath}/`);
        });

        if (childHasAccess) {
            return true;
        }

        if (!hasPermission(menu.access, action)) {
            return false;
        }

        if (menu.child.length > 0) {
            return normalizedRoute === menuPath;
        }

        return normalizedRoute === menuPath || normalizedRoute.startsWith(`${menuPath}/`);
    });
};
