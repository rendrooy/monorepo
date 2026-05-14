import { locales, tableNames } from '../config';
import type {BaseRequest, BaseResponseDropdown, MasterRoleInterface} from "@monorepo/types";
import { findOneQuery, FindParams, findQuery, insertQuery, updateQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';


export const loadRoleService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterRoleInterface;
        const page = params.metadata?.page || 1;
        const limit = params.metadata?.pageSize || 100;
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
        });;
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

        const data = await findQuery(tableNames.masterRole, queryParams);
        let result: BaseResponseDropdown[] = [];
        data.map((item) => {
            result.push({
                value: item.id,
                label: item.name
            })
        })
        console.info("getRoleService role:", result);

        return {
            status: 200,
            message: locales.request_success,
            data: result,
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