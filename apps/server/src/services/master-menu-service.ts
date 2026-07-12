import { locales, tableNames } from "../config";
import { logger } from "../config/logger";
import type { BaseRequest, MasterMenuInterface } from "@monorepo/types";
import { countQuery, FindParams, findOneQuery, findQuery, insertQuery, updateQuery } from "../config/query/query-runner";
import { Condition, OperatorTypes, QueryData } from "../config/query/query-builder";

const buildMenuParams = (params: MasterMenuInterface): QueryData => {
    const menuLevel = Number(params.menu_level ?? 1);

    return {
        name: params.name,
        code: params.code,
        path_url: params.path_url,
        icon: params.icon,
        menu_level: menuLevel,
        parent_id: menuLevel > 1 ? params.parent_id || null : null,
        sort_order: params.sort_order ?? 0,
        is_active: params.is_active ?? true,
    };
};

const getMenuFilterOperator = (key: string) => {
    const exactKeys = ["id", "parent_id", "menu_level", "sort_order", "is_active", "is_deleted"];

    return exactKeys.includes(key) ? OperatorTypes.EQUAL : OperatorTypes.LIKE;
};

export const getMenuService = async (request: MasterMenuInterface) => {
    try {
        const queryParams: FindParams = {
            conditions: [
                {
                    column: "id",
                    value: request.id,
                },
            ],
        };

        const data = await findOneQuery<MasterMenuInterface>(tableNames.masterMenu, queryParams);

        if (data) {
            return {
                status: 200,
                message: locales.request_success,
                data,
            };
        }

        return {
            status: 404,
            message: locales.resource_not_found,
        };
    } catch (error) {
        logger.error({ err: error }, "Menu lookup failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
        };
    }
};

export const loadMenuService = async (request: BaseRequest<MasterMenuInterface>) => {
    try {
        const params = request.params as MasterMenuInterface;
        const page = request.metadata?.page || 1;
        const limit = request.metadata?.pageSize || 100;
        const offset = (page - 1) * limit;
        const conditionParams: Condition[] = [
            {
                column: "is_deleted",
                value: false,
                operator: OperatorTypes.EQUAL,
            },
        ];

        for (const key in params) {
            const value = params[key as keyof MasterMenuInterface];
            if (value !== undefined && value !== null && value !== "") {
                conditionParams.push({
                    column: key,
                    value: value as string | number | boolean,
                    operator: getMenuFilterOperator(key),
                });
            }
        }

        const queryParams: FindParams = {
            conditions: conditionParams,
            limit,
            offset,
            order: {
                order_by: request.metadata?.sortBy ?? "sort_order",
                order_dir: request.metadata?.sortDir ?? "ASC",
            },
        };

        const [data, total] = await Promise.all([
            findQuery<MasterMenuInterface>(tableNames.masterMenu, queryParams),
            countQuery(tableNames.masterMenu, { conditions: conditionParams }),
        ]);

        return {
            status: 200,
            message: locales.request_success,
            data,
            metaData: {
                total,
                page,
                pageSize: limit,
            },
        };
    } catch (error) {
        logger.error({ err: error }, "Menu list failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};

export const createMenuService = async (request: MasterMenuInterface) => {
    try {
        const newMenu = await insertQuery<MasterMenuInterface>(tableNames.masterMenu, buildMenuParams(request));

        return {
            status: 201,
            message: locales.request_success,
            data: newMenu,
        };
    } catch (error) {
        logger.error({ err: error }, "Menu creation failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};

export const updateMenuService = async (request: MasterMenuInterface) => {
    try {
        await updateQuery<MasterMenuInterface>(
            tableNames.masterMenu,
            {
                ...buildMenuParams(request),
                updated_time: new Date(),
            },
            { id: request.id },
        );

        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        logger.error({ err: error }, "Menu update failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};

export const deleteMenuService = async (request: MasterMenuInterface) => {
    try {
        await updateQuery<MasterMenuInterface>(
            tableNames.masterMenu,
            {
                is_deleted: true,
                updated_time: new Date(),
            },
            { id: request.id },
        );

        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        logger.error({ err: error }, "Menu deletion failed");
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};
