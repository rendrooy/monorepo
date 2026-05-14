import { locales, tableNames } from '../config';
import type {BaseRequest, MasterRoleInterface} from "@monorepo/types";
import { findOneQuery, FindParams, findQuery, insertQuery, updateQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';


export const getRoleService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterRoleInterface;
        const conditionParams: Condition[] = [];
        const queryParams: FindParams = {
            conditions: conditionParams,
        };
        conditionParams.push({
            column: "id",
            value: params.id,
        });

        const data = await findOneQuery(tableNames.masterRole, queryParams);
        console.info("getRoleService Role:", data);

        if (data) {
            return {
                status: 200,
                message: locales.request_success,
                data: data,
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

export const loadRoleService = async (request: BaseRequest) => {
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
            value:false,
            operator: OperatorTypes.EQUAL
        });
        for (const key in params) {
            const value = params[key as keyof MasterRoleInterface];
            const isMetadata = key !== "metadata";
            if (value && isMetadata) {
                conditionParams.push({
                    column: key,
                    value: value,
                    operator: OperatorTypes.LIKE
                });
            }
        }
        console.info("getRoleService conditionParams:", conditionParams);

        // conditionParams.push({
        //     column: "rolename",
        //     value: params.rolename,
        //     operator: OperatorTypes.LIKE
        // });
        const data = await findQuery(tableNames.masterRole, queryParams);
        console.info("getRoleService role:", data);

        return {
            status: 200,
            message: locales.request_success,
            data: data,
            metaData: {
                total: data.length,
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

export const createRoleService = async (request: BaseRequest) => {
    // Implementasi logika untuk createRoleService
    try {
        const params = request.params as MasterRoleInterface;
        const crateParams: QueryData = {
            name: params.name,
            code: params.code,
        }
        const newRole = await insertQuery(tableNames.masterRole, crateParams);
        console.info("createRoleService newRole:", newRole);
        return {
            status: 201,
            message: locales.request_success,
            data: newRole,
        };
    } catch (error) {
        console.error("createRoleService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const updateRoleService = async (request: BaseRequest) => {
    // Implementasi logika untuk updateRoleService
    try {
        const params = request.params as MasterRoleInterface;
        const updateParams: QueryData = {
            rolename: params.name,
            code: params.code,
        }
        const updatedData = await updateQuery(tableNames.masterRole, updateParams, { id: params.id });
        console.info("updateRoleService updatedRole:", updatedData);
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        console.error("updateRoleService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const deleteRoleService = async (request: BaseRequest) => {
    // Implementasi logika untuk deleteRoleService
    try {
        const params = request.params as MasterRoleInterface;
        const paramsQuery:QueryData = {
            is_deleted: true,
        }
        const deletedRole = await updateQuery(tableNames.masterRole, paramsQuery, { id: params.id });
        console.info("deleteRoleService deletedRole:", deletedRole);
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        console.error("deleteRoleService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};
