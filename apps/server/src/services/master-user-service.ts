import { locales, tableNames } from '../config';
import type { BaseRequest, MasterUserInterface } from "@monorepo/types";
import { findOneQuery, FindParams, JoinClause, findQuery, insertQuery, updateQuery, countQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';

const USER_ALIAS = "u";
const ROLE_ALIAS = "r";
const MEMBER_ALIAS = "m";

const userJoins: JoinClause[] = [
    {
        type: "LEFT",
        table: tableNames.masterRole,
        alias: ROLE_ALIAS,
        on: `${USER_ALIAS}.role_id = ${ROLE_ALIAS}.id`,
    },
    {
        type: "LEFT",
        table: tableNames.masterMember,
        alias: MEMBER_ALIAS,
        on: `${USER_ALIAS}.member_id = ${MEMBER_ALIAS}.id`,
    },
];

const selectedColumns = [
    `${USER_ALIAS}.id`,
    `${USER_ALIAS}.username`,
    `${USER_ALIAS}.email`,
    `${USER_ALIAS}.role_id`,
    `${ROLE_ALIAS}.name AS role_name`,
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
    `${USER_ALIAS}.is_deleted`,
    `${USER_ALIAS}.created_time`,
    `${USER_ALIAS}.updated_time`,
].join(", ");

export const getUserService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterUserInterface;
        const conditionParams: Condition[] = [
            {
                column: `${USER_ALIAS}.id`,
                value: params.id,
                operator: OperatorTypes.EQUAL,
            },
        ];

        const queryParams: FindParams = {
            selectedColumns,
            joins: userJoins,
            conditions: conditionParams,
        };

        const user = await findOneQuery(`${tableNames.masterUser} ${USER_ALIAS}`, queryParams);
        console.info("getUserService user:", user);

        if (user) {
            return { status: 200, message: locales.request_success, data: user };
        }
        return { status: 404, message: locales.resource_not_found };
    } catch (error) {
        return { status: 500, message: locales.unable_to_handle_request };
    }
};

export const loadUserService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterUserInterface;
        const page = request.metadata?.page || 1;
        const limit = request.metadata?.pageSize || 100;
        const offset = (page - 1) * limit;

        const conditionParams: Condition[] = [
            {
                column: `${USER_ALIAS}.is_deleted`,
                value: false,
                operator: OperatorTypes.EQUAL,
            },
        ];

        // only filter on actual user columns, skip joined fields
        const filterableKeys: (keyof MasterUserInterface)[] = ["username", "email", "role_id", "member_id"];
        for (const key of filterableKeys) {
            const value = params?.[key];
            if (value) {
                conditionParams.push({
                    column: `${USER_ALIAS}.${key}`,
                    value,
                    operator: OperatorTypes.LIKE,
                });
            }
        }

        const queryParams: FindParams = {
            selectedColumns,
            joins: userJoins,
            conditions: conditionParams,
            limit,
            offset,
        };

        const [users, total] = await Promise.all([
            findQuery(`${tableNames.masterUser} ${USER_ALIAS}`, queryParams),
            countQuery(`${tableNames.masterUser} ${USER_ALIAS}`, { conditions: conditionParams, joins: userJoins }),
        ]);

        return {
            status: 200,
            message: locales.request_success,
            data: users,
            metaData: { total, page, pageSize: limit },
        };
    } catch (error) {
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const createUserService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterUserInterface;
        const crateParams: QueryData = {
            username: params.username,
            email: params.email,
            ...(params.password && { password: params.password }),
            ...(params.role_id && { role_id: params.role_id }),
            ...(params.member_id && { member_id: params.member_id }),
        };
        const newUser = await insertQuery(tableNames.masterUser, crateParams);
        console.info("createUserService newUser:", newUser);
        return { status: 201, message: locales.request_success, data: newUser };
    } catch (error) {
        console.error("createUserService error:", error);
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const updateUserService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterUserInterface;
        const updateParams: QueryData = {
            username: params.username,
            email: params.email,
            ...(params.role_id !== undefined && { role_id: params.role_id }),
            ...(params.member_id !== undefined && { member_id: params.member_id }),
            // only update password if provided
            ...(params.password && { password: params.password }),
        };
        const updatedUser = await updateQuery(tableNames.masterUser, updateParams, { id: params.id });
        console.info("updateUserService updatedUser:", updatedUser);
        return { status: 200, message: locales.request_success };
    } catch (error) {
        console.error("updateUserService error:", error);
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const deleteUserService = async (request: BaseRequest) => {
    try {
        const params = request.params as MasterUserInterface;
        const deletedUser = await updateQuery(tableNames.masterUser, { is_deleted: true }, { id: params.id });
        console.info("deleteUserService deletedUser:", deletedUser);
        return { status: 200, message: locales.request_success };
    } catch (error) {
        console.error("deleteUserService error:", error);
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};
