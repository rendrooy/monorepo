import { locales, tableNames } from '../config';
import type { BaseRequest, MasterMemberInterface } from "@monorepo/types";
import { findOneQuery, FindParams, findQuery, insertQuery, updateQuery, countQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';


export const getMemberService = async (request: MasterMemberInterface) => {
    try {
        const conditionParams: Condition[] = [];
        const queryParams: FindParams = {
            conditions: conditionParams,
        };
        conditionParams.push({
            column: "id",
            value: request.id,
        });

        const data = await findOneQuery(tableNames.masterMember, queryParams);
        console.info("getMemberService Member:", data);

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

export const loadMemberService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterMemberInterface;
        const page = request.metadata?.page || 1;
        const limit = request.metadata?.pageSize || 100;
        const sortBy = request.metadata?.sortBy || "created_time"
        const sortDir = request.metadata?.sortDir || "DESC"
        const offset = (page - 1) * limit;
        const conditionParams: Condition[] = [];

        const queryParams: FindParams = {
            conditions: conditionParams,
            limit: limit,
            offset: offset,
            order: { order_by: sortBy, order_dir: sortDir },
        };
        conditionParams.push({
            column: "is_deleted",
            value: false,
            operator: OperatorTypes.EQUAL
        });

        for (const key in params) {
            const value = params[key as keyof MasterMemberInterface];
            const isMetadata = key !== "metadata";
            if (value && isMetadata) {
                conditionParams.push({
                    column: key,
                    value: value,
                    operator: OperatorTypes.LIKE
                });
            }
        }
        console.info("getMemberService conditionParams:", conditionParams);
        const [data, total] = await Promise.all([
            findQuery(tableNames.masterMember, queryParams),
            countQuery(tableNames.masterMember, { conditions: conditionParams }),
        ]);

        return {
            status: 200,
            message: locales.request_success,
            data: data,
            metaData: {
                total: total,
                page: page,
                pageSize: limit,
                sortBy: request.metadata?.sortBy,
                sortDir: request.metadata?.sortDir
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

export const createMemberService = async (request: MasterMemberInterface) => {
    // Implementasi logika untuk createMemberService
    try {
        // const params = request.params as MasterMemberInterface;
        const crateParams: QueryData = {
            ...request as MasterMemberInterface,
        }
        console.info("createMemberService crate:", crateParams);
        const newMember = await insertQuery(tableNames.masterMember, crateParams);
        return {
            status: 201,
            message: locales.request_success,
            data: newMember,
        };
    } catch (error) {
        console.error("createMemberService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const updateMemberService = async (request: MasterMemberInterface) => {
    // Implementasi logika untuk updateMemberService
    try {
        // const params = request.params as MasterMemberInterface;
        const updateParams: QueryData = {
            ...request as MasterMemberInterface,
        }
        console.info("createMemberService update:", updateParams);
        const updatedData = await updateQuery(tableNames.masterMember, updateParams, { id: updateParams.id });
        return {
            status: 200,
            message: locales.request_success,
            data: updatedData,
        };
    } catch (error) {
        console.error("updateMemberService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
}

export const deleteMemberService = async (request: MasterMemberInterface) => {
    // Implementasi logika untuk deleteMemberService
    try {
        const paramsQuery: QueryData = {
            is_deleted: true,
        }
        console.info("createMemberService update:", paramsQuery);
        const deletedMember = await updateQuery(tableNames.masterMember, paramsQuery, { id: request.id });
        return {
            status: 200,
            message: locales.request_success,
        };
    } catch (error) {
        console.error("deleteMemberService error:", error);
        return {
            status: 500,
            message: locales.unable_to_handle_request,
            data: null,
        };
    }
};
