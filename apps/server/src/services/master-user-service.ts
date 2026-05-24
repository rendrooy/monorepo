import { locales, tableNames } from '../config';
import type { BaseRequest, MasterUserInterface } from "@monorepo/types";
import { findOneQuery, FindParams, findQuery, insertQuery, updateQuery, countQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';



export const getUserService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterUserInterface;
        const conditionParams: Condition[] = [

        ];
        const queryParams: FindParams = {
            conditions: conditionParams,
        };
        conditionParams.push({
            column: "id",
            value: params.id,
        });

        const user = await findOneQuery(tableNames.masterUser, queryParams);
        console.info("getUserService user:", user);

        if (user) {
            return {
                status: 200,
                message: locales.request_success,
                data: user,
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

export const loadUserService = async (request: BaseRequest) => {
    try {

        const params = request.params as MasterUserInterface;
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
            const value = params[key as keyof MasterUserInterface];
            const isMetadata = key !== "metadata";
            if (value && isMetadata) {
                conditionParams.push({
                    column: key,
                    value: value,
                    operator: OperatorTypes.LIKE
                });
            }
        }
        console.info("getUserService conditionParams:", conditionParams);

        const [users, total] = await Promise.all([
            findQuery(tableNames.masterUser, queryParams),
            countQuery(tableNames.masterUser, { conditions: conditionParams }),
        ]);
        console.info("getUserService user:", users);

        return {
            status: 200,
            message: locales.request_success,
            data: users,
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

export const createUserService = async (request: BaseRequest) => {
    // Implementasi logika untuk createUserService
    try {
        const params = request.params as MasterUserInterface;
        const crateParams: QueryData = {
            username: params.username,
            email: params.email,
        }
        const newUser = await insertQuery(tableNames.masterUser, crateParams);
        console.info("createUserService newUser:", newUser);
        return {
            status: 201,
            message: locales.request_success,
            data: newUser,
        };
    } catch (error) {
        console.error("createUserService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const updateUserService = async (request: BaseRequest) => {
    // Implementasi logika untuk updateUserService
    try {
        const params = request.params as MasterUserInterface;
        const updateParams: QueryData = {
            username: params.username,
            email: params.email,
        }
        const updatedUser = await updateQuery(tableNames.masterUser, updateParams, { id: params.id });
        console.info("updateUserService updatedUser:", updatedUser);
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        console.error("updateUserService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const deleteUserService = async (request: BaseRequest) => {
    // Implementasi logika untuk deleteUserService
    try {
        const params = request.params as MasterUserInterface;
        const paramsQuery: QueryData = {
            is_deleted: true,
        }
        const deletedUser = await updateQuery(tableNames.masterUser, paramsQuery, { id: params.id });
        console.info("deleteUserService deletedUser:", deletedUser);
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        console.error("deleteUserService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};
