import { locales, tableNames } from '../config';
import { logger } from '../config/logger';
import type { BaseRequest, MasterRoleInterface, MasterRoleMenuPermissionInterface } from "@monorepo/types";
import { findOneQuery, FindParams, findQuery, insertQuery, updateQuery, countQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';

const buildRoleParams = (params: MasterRoleInterface): QueryData => ({
    name: params.name,
    code: params.code,
    '"desc"': params.desc,
    is_active: params.is_active,
});

const loadRolePermissions = async (roleId?: string | null) => {
    if (!roleId) return [];

    return findQuery<MasterRoleMenuPermissionInterface>(
        `${tableNames.masterRoleMenuPermission} rmp`,
        {
            selectedColumns: `
                rmp.id,
                rmp.role_id,
                rmp.menu_id,
                rmp.permission_mask,
                rmp.is_active,
                m.name AS menu_name,
                m.code AS menu_code,
                m.menu_level,
                m.parent_id,
                m.path_url
            `,
            joins: [
                {
                    table: tableNames.masterMenu,
                    alias: "m",
                    on: "m.id = rmp.menu_id",
                },
            ],
            conditions: [
                {
                    column: "role_id",
                    tableAlias: "rmp",
                    value: roleId,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: "is_deleted",
                    tableAlias: "rmp",
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: "is_deleted",
                    tableAlias: "m",
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
            ],
            limit: 1000,
            order: {
                order_by: "m.menu_level ASC, m.sort_order",
                order_dir: "ASC",
            },
        },
    );
};

const loadDefaultRolePermissions = async () =>
    findQuery<MasterRoleMenuPermissionInterface>(
        tableNames.masterMenu,
        {
            selectedColumns: `
                id AS menu_id,
                name AS menu_name,
                code AS menu_code,
                menu_level,
                parent_id,
                path_url,
                0 AS permission_mask,
                true AS is_active
            `,
            conditions: [
                {
                    column: "is_deleted",
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: "is_active",
                    value: true,
                    operator: OperatorTypes.EQUAL,
                },
            ],
            limit: 1000,
            order: {
                order_by: "menu_level ASC, sort_order",
                order_dir: "ASC",
            },
        },
    );

const syncRolePermissions = async (
    roleId?: string | null,
    permissions?: MasterRoleMenuPermissionInterface[],
    fallbackToActiveMenus = false,
) => {
    if (!roleId) return;

    const resolvedPermissions =
        permissions?.length || !fallbackToActiveMenus
            ? permissions ?? []
            : await loadDefaultRolePermissions();

    await updateQuery(
        tableNames.masterRoleMenuPermission,
        {
            is_deleted: true,
            updated_time: new Date(),
        },
        { role_id: roleId },
    );

    const activePermissions = resolvedPermissions.filter((permission) => permission.menu_id);

    await Promise.all(
        activePermissions.map(async (permission) => {
            const insertedPermission = await insertQuery(tableNames.masterRoleMenuPermission, {
                role_id: roleId,
                menu_id: permission.menu_id,
                permission_mask: Number(permission.permission_mask ?? 0),
                is_active: permission.is_active ?? true,
            });

            if (!insertedPermission) {
                throw new Error("Failed to insert role menu permission");
            }
        }),
    );
};

export const getRoleService = async (request: MasterRoleInterface) => {
    try {
        const params = request;
        const conditionParams: Condition[] = [];
        const queryParams: FindParams = {
            conditions: conditionParams,
        };
        conditionParams.push({
            column: "id",
            value: params.id,
        });

        const data = await findOneQuery<MasterRoleInterface>(tableNames.masterRole, queryParams);
        logger.debug({ found: Boolean(data) }, "Role lookup completed");

        if (data) {
            const rolePermissions = await loadRolePermissions(data.id);

            return {
                status: 200,
                message: locales.request_success,
                data: {
                    ...data,
                    role_permissions: rolePermissions,
                },
            };
        }
        const BaseResponse = {
            status: 404,
            message: locales.resource_not_found,
        };
        return BaseResponse;
    } catch (error) {
        const BaseResponse = {
            status: 500,
            message: locales.unable_to_handle_request,

        };
        return BaseResponse;
    }
};

export const loadRoleService = async (request: BaseRequest<MasterRoleInterface>) => {
    try {
        const params = request.params as MasterRoleInterface;
        const page = request.metadata?.page || 1;
        const limit = request.metadata?.pageSize || 100;
        const offset = (page - 1) * limit;
        const conditionParams: Condition[] = [];

        const queryParams: FindParams = {
            conditions: conditionParams,
            limit: limit,
            offset: offset,
        };
        conditionParams.push({
            column: "is_deleted",
            value: false,
            operator: OperatorTypes.EQUAL
        });
        for (const key in params) {
            const value = params[key as keyof MasterRoleInterface];
            const isFilterable = key !== "metadata" && key !== "role_permissions";
            if (value && isFilterable) {
                conditionParams.push({
                    column: key,
                    value: value as string | number | boolean | Date,
                    operator: OperatorTypes.LIKE
                });
            }
        }
        logger.debug({ conditionCount: conditionParams.length }, "Role list prepared");

        const [data, total] = await Promise.all([
            findQuery(tableNames.masterRole, queryParams),
            countQuery(tableNames.masterRole, { conditions: conditionParams }),
        ]);
        logger.debug({ resultCount: data.length }, "Role list completed");

        return {
            status: 200,
            message: locales.request_success,
            data: data,
            metaData: {
                total: total,
                page: page,
                pageSize: limit,
            }
        };
    } catch (error) {
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};

export const createRoleService = async (request: MasterRoleInterface) => {
    // Implementasi logika untuk createRoleService
    try {
        const params = request;
        const newRole = await insertQuery<MasterRoleInterface>(tableNames.masterRole, buildRoleParams(params));

        if (!newRole?.id) {
            throw new Error("Failed to insert role");
        }

        await syncRolePermissions(newRole?.id, params.role_permissions, true);
        logger.info({ roleId: newRole?.id }, "Role created");
        return {
            status: 201,
            message: locales.request_success,
            data: newRole,
        };
    } catch (error) {
        logger.error({ err: error }, "Role creation failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const updateRoleService = async (request: MasterRoleInterface) => {
    // Implementasi logika untuk updateRoleService
    try {
        const params = request;
        const updatedData = await updateQuery(tableNames.masterRole, buildRoleParams(params), { id: params.id });

        if (!updatedData) {
            throw new Error("Failed to update role");
        }

        await syncRolePermissions(params.id, params.role_permissions);
        logger.info("Role updated");
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        logger.error({ err: error }, "Role update failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const deleteRoleService = async (request: MasterRoleInterface) => {
    // Implementasi logika untuk deleteRoleService
    try {
        const params = request;
        const paramsQuery: QueryData = {
            is_deleted: true,
        }
        const deletedRole = await updateQuery(tableNames.masterRole, paramsQuery, { id: params.id });
        logger.info("Role deleted");
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        logger.error({ err: error }, "Role deletion failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};
