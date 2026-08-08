"use client";

import { useApiService } from "@/hooks";
import type {
    BaseResponse,
    MasterMenuInterface,
    MasterRoleMenuPermissionInterface,
} from "@monorepo/types";
import { Checkbox } from "@monorepo/ui/components/checkbox";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const PERMISSION_COLUMNS = [
    { key: "DELETE", label: "Delete", bit: 1 << 5 },
    { key: "ADD", label: "Add", bit: 1 << 4 },
    { key: "EDIT", label: "Edit", bit: 1 << 3 },
    { key: "ACTION", label: "Action", bit: 1 << 2 },
    { key: "DOWNLOAD", label: "Download", bit: 1 << 1 },
    { key: "READ", label: "Read", bit: 1 << 0 },
] as const;

const FULL_PERMISSION_MASK = PERMISSION_COLUMNS.reduce(
    (mask, column) => mask | column.bit,
    0,
);

type RolePermissionMatrixProps = {
    disabled?: boolean;
    loadingMenus?: boolean;
    menus?: MasterMenuInterface[];
    permissions?: MasterRoleMenuPermissionInterface[];
    onChange: (permissions: MasterRoleMenuPermissionInterface[]) => void;
};

type PermissionRow = MasterRoleMenuPermissionInterface;

type GroupedPermissionRow = {
    depth: number;
    isGroup: boolean;
    row: PermissionRow;
};

function hasPermission(mask: number, bit: number) {
    return (mask & bit) === bit;
}

function togglePermission(mask: number, bit: number) {
    return hasPermission(mask, bit) ? mask & ~bit : mask | bit;
}

function hasAllPermissions(mask: number) {
    return (mask & FULL_PERMISSION_MASK) === FULL_PERMISSION_MASK;
}

function normalizePermissions(
    menus: MasterMenuInterface[],
    permissions: MasterRoleMenuPermissionInterface[] = [],
) {
    return menus.map((menu) => {
        const existing = permissions.find((item) => item.menu_id === menu.id);

        return {
            id: existing?.id,
            role_id: existing?.role_id,
            menu_id: menu.id ?? "",
            menu_name: menu.name,
            menu_code: menu.code,
            menu_level: menu.menu_level,
            parent_id: menu.parent_id,
            path_url: menu.path_url,
            permission_mask: existing?.permission_mask ?? 0,
            is_active: existing?.is_active ?? true,
        };
    });
}

function isSamePermissionRows(
    current: MasterRoleMenuPermissionInterface[] = [],
    next: MasterRoleMenuPermissionInterface[],
) {
    if (current.length !== next.length) return false;

    const currentMap = new Map(
        current.map((item) => [item.menu_id, Number(item.permission_mask ?? 0)]),
    );

    return next.every(
        (item) => currentMap.get(item.menu_id) === Number(item.permission_mask ?? 0),
    );
}

function buildGroupedRows(rows: PermissionRow[]): GroupedPermissionRow[] {
    const childMap = new Map<string, PermissionRow[]>();
    const rowMap = new Map<string, PermissionRow>();

    rows.forEach((row) => {
        if (row.menu_id) {
            rowMap.set(row.menu_id, row);
        }

        if (row.parent_id) {
            const children = childMap.get(row.parent_id) ?? [];
            children.push(row);
            childMap.set(row.parent_id, children);
        }
    });

    const groupedRows: GroupedPermissionRow[] = [];
    const visited = new Set<string>();

    const appendRow = (row: PermissionRow, depth: number) => {
        if (!row.menu_id || visited.has(row.menu_id)) return;

        visited.add(row.menu_id);

        const children = childMap.get(row.menu_id) ?? [];
        groupedRows.push({
            depth,
            isGroup: children.length > 0,
            row,
        });

        children.forEach((child) => appendRow(child, depth + 1));
    };

    rows
        .filter((row) => !row.parent_id || !rowMap.has(row.parent_id))
        .forEach((row) => appendRow(row, 0));

    rows.forEach((row) => appendRow(row, 0));

    return groupedRows;
}

export function RolePermissionMatrix({
    disabled = false,
    loadingMenus = false,
    menus: providedMenus,
    permissions = [],
    onChange,
}: RolePermissionMatrixProps) {
    const { callApi: callLoadMenu, loading: loadingTenantMenus } = useApiService("loadDataMenu");
    const [tenantMenus, setTenantMenus] = useState<MasterMenuInterface[]>([]);
    const loadedRef = useRef(false);
    const menus = providedMenus ?? tenantMenus;
    const loading = providedMenus === undefined ? loadingTenantMenus : loadingMenus;

    const loadMenus = useCallback(async () => {
        if (providedMenus !== undefined) return;
        if (loadedRef.current) return;

        loadedRef.current = true;

        await callLoadMenu(
            {
                params: {
                    is_active: true,
                },
                metadata: {
                    page: 1,
                    pageSize: 1000,
                    sortBy: "menu_level ASC, sort_order",
                    sortDir: "ASC",
                },
            },
            {
                onSuccess(response: BaseResponse<MasterMenuInterface[]>) {
                    setTenantMenus(response.data ?? []);
                },
                onError() {
                    loadedRef.current = false;
                    setTenantMenus([]);
                },
            },
        );
    }, [callLoadMenu, providedMenus]);

    useEffect(() => {
        loadMenus();
    }, [loadMenus]);

    const rows = useMemo(
        () => normalizePermissions(menus, permissions),
        [menus, permissions],
    );

    const groupedRows = useMemo(() => buildGroupedRows(rows), [rows]);

    useEffect(() => {
        if (!menus.length || isSamePermissionRows(permissions, rows)) return;

        onChange(rows);
    }, [menus.length, onChange, permissions, rows]);

    const handleToggle = useCallback(
        (menuId: string | null | undefined, bit: number) => {
            if (!menuId) return;

            onChange(
                rows.map((row) =>
                    row.menu_id === menuId
                        ? {
                            ...row,
                            permission_mask: togglePermission(
                                Number(row.permission_mask ?? 0),
                                bit,
                            ),
                        }
                        : row,
                ),
            );
        },
        [onChange, rows],
    );

    const handleToggleRowAll = useCallback(
        (menuId: string | null | undefined) => {
            if (!menuId) return;

            onChange(
                rows.map((row) => {
                    if (row.menu_id !== menuId) return row;

                    const mask = Number(row.permission_mask ?? 0);

                    return {
                        ...row,
                        permission_mask: hasAllPermissions(mask) ? 0 : FULL_PERMISSION_MASK,
                    };
                }),
            );
        },
        [onChange, rows],
    );


    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-base font-semibold">Hak Akses Menu</h3>
                <p className="text-sm text-muted-foreground">
                    Atur permission role untuk setiap menu aplikasi.
                </p>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Menu</th>
                            <th className="px-4 py-3 text-left font-semibold">Path</th>
                            <th className="px-3 py-3 text-center font-semibold">
                                <div className="flex flex-col items-center gap-1">
                                    <span>All</span>
                                    {/* <Checkbox
                                        disabled={disabled || permissionableRows.length === 0}
                                        checked={allRowsChecked}
                                        onCheckedChange={handleToggleAllRows}
                                    /> */}
                                </div>
                            </th>
                            {PERMISSION_COLUMNS.map((column) => (
                                <th key={column.key} className="px-3 py-3 text-center font-semibold">
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={PERMISSION_COLUMNS.length + 3} className="px-4 py-6 text-center text-muted-foreground">
                                    Loading...
                                </td>
                            </tr>
                        ) : null}

                        {!loading && rows.length === 0 ? (
                            <tr>
                                <td colSpan={PERMISSION_COLUMNS.length + 3} className="px-4 py-6 text-center text-muted-foreground">
                                    Belum ada menu aktif.
                                </td>
                            </tr>
                        ) : null}

                        {!loading && groupedRows.map(({ depth, isGroup, row }) => {
                            const mask = Number(row.permission_mask ?? 0);
                            const canEditPermission = !isGroup;

                            return (
                                <tr
                                    key={row.menu_id}
                                    className={`border-t border-slate-100 ${isGroup ? "bg-slate-50" : "bg-white"
                                        }`}
                                >
                                    <td className="px-4 py-3">
                                        <div
                                            className={`${isGroup ? "font-semibold text-slate-800" : "font-medium"
                                                }`}
                                            style={{ paddingLeft: `${depth * 20}px` }}
                                        >
                                            {row.menu_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            <span style={{ paddingLeft: `${depth * 20}px` }}>
                                                {row.menu_code} | Level {row.menu_level ?? 1}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {row.path_url}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        {canEditPermission ? (
                                            <Checkbox
                                                disabled={disabled}
                                                checked={hasAllPermissions(mask)}
                                                onCheckedChange={() => handleToggleRowAll(row.menu_id)}
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    {PERMISSION_COLUMNS.map((column) => (
                                        <td key={column.key} className="px-3 py-3 text-center">
                                            {canEditPermission ? (
                                                <Checkbox
                                                    disabled={disabled}
                                                    checked={hasPermission(mask, column.bit)}
                                                    onCheckedChange={() => handleToggle(row.menu_id, column.bit)}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
