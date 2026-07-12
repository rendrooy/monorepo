import { locales, tableNames } from '../config';
import { logger } from '../config/logger';
import type { BaseRequest, MasterRoleInterface, MasterUserInterface } from "@monorepo/types";
import { findOneQuery, FindParams, JoinClause, findQuery, insertQuery, updateQuery, countQuery } from '../config/query/query-runner';
import { Condition, OperatorTypes, QueryData } from '../config/query/query-builder';
import { hashPassword, isPasswordHashed } from '../utils/password';
import { getCurrentAuth } from '../utils/request-context';

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
    `${MEMBER_ALIAS}.nik AS member_nik`,
    `${USER_ALIAS}.registration_status`,
    `${USER_ALIAS}.approved_time`,
    `${USER_ALIAS}.approved_by_id`,
    `${USER_ALIAS}.rejected_time`,
    `${USER_ALIAS}.rejected_by_id`,
    `${USER_ALIAS}.rejection_note`,
    `${USER_ALIAS}.is_active`,
    `${USER_ALIAS}.is_deleted`,
    `${USER_ALIAS}.created_time`,
    `${USER_ALIAS}.updated_time`,
].join(", ");

export const getUserService = async (request: MasterUserInterface) => {
    try {
        const params = request;
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
        logger.debug({ found: Boolean(user) }, "User lookup completed");

        if (user) {
            return { status: 200, message: locales.request_success, data: user };
        }
        return { status: 404, message: locales.resource_not_found };
    } catch (error) {
        return { status: 500, message: locales.unable_to_handle_request };
    }
};

export const loadUserService = async (request: BaseRequest<MasterUserInterface>) => {
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
        const filterableKeys: (keyof MasterUserInterface)[] = [
            "username",
            "email",
            "role_id",
            "member_id",
            "registration_status",
            "is_active",
        ];
        for (const key of filterableKeys) {
            const value = params?.[key];
            if (value !== undefined && value !== null && value !== "") {
                const exactKeys: (keyof MasterUserInterface)[] = [
                    "role_id",
                    "member_id",
                    "registration_status",
                    "is_active",
                ];
                conditionParams.push({
                    column: `${USER_ALIAS}.${key}`,
                    value: value as string | number | boolean | Date,
                    operator: exactKeys.includes(key) ? OperatorTypes.EQUAL : OperatorTypes.LIKE,
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

export const createUserService = async (request: MasterUserInterface) => {
    try {
        const params = request;
        const password = params.password
            ? isPasswordHashed(params.password)
                ? params.password
                : hashPassword(params.password)
            : undefined;
        const crateParams: QueryData = {
            username: params.username,
            email: params.email,
            ...(password && { password }),
            ...(params.role_id && { role_id: params.role_id }),
            ...(params.member_id && { member_id: params.member_id }),
            registration_status: params.registration_status ?? "APPROVED",
            is_active: params.is_active ?? true,
        };
        const newUser = await insertQuery(tableNames.masterUser, crateParams);
        logger.info("User created");
        return { status: 201, message: locales.request_success, data: newUser };
    } catch (error) {
        logger.error({ err: error }, "User creation failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const updateUserService = async (request: MasterUserInterface) => {
    try {
        const params = request;
        const password = params.password
            ? isPasswordHashed(params.password)
                ? params.password
                : hashPassword(params.password)
            : undefined;
        const updateParams: QueryData = {
            username: params.username,
            email: params.email,
            ...(params.role_id !== undefined && { role_id: params.role_id }),
            ...(params.member_id !== undefined && { member_id: params.member_id }),
            ...(params.registration_status !== undefined && { registration_status: params.registration_status }),
            ...(params.is_active !== undefined && { is_active: params.is_active }),
            ...(params.approved_time !== undefined && { approved_time: params.approved_time }),
            ...(params.approved_by_id !== undefined && { approved_by_id: params.approved_by_id }),
            ...(params.rejected_time !== undefined && { rejected_time: params.rejected_time }),
            ...(params.rejected_by_id !== undefined && { rejected_by_id: params.rejected_by_id }),
            ...(params.rejection_note !== undefined && { rejection_note: params.rejection_note }),
            // only update password if provided
            ...(password && { password }),
        };
        const updatedUser = await updateQuery(tableNames.masterUser, updateParams, { id: params.id });
        logger.info("User updated");
        return { status: 200, message: locales.request_success };
    } catch (error) {
        logger.error({ err: error }, "User update failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const deleteUserService = async (request: MasterUserInterface) => {
    try {
        const params = request;
        const deletedUser = await updateQuery(tableNames.masterUser, { is_deleted: true }, { id: params.id });
        logger.info("User deleted");
        return { status: 200, message: locales.request_success };
    } catch (error) {
        logger.error({ err: error }, "User deletion failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

const buildBasePendingRegistrationConditions = (): Condition[] => [
    {
        column: `${USER_ALIAS}.is_deleted`,
        value: false,
        operator: OperatorTypes.EQUAL,
    },
    {
        column: `${USER_ALIAS}.registration_status`,
        value: "PENDING",
        operator: OperatorTypes.EQUAL,
    },
];

const findDefaultResidentRole = async () =>
    findOneQuery<MasterRoleInterface>(tableNames.masterRole, {
        selectedColumns: "id, code, name",
        conditions: [
            {
                column: "code",
                value: "WRG",
                operator: OperatorTypes.EQUAL,
            },
            {
                column: "is_deleted",
                value: false,
                operator: OperatorTypes.EQUAL,
            },
        ],
    });

export const loadUserRegistrationService = async (request: BaseRequest<MasterUserInterface>) => {
    try {
        const params = request.params as MasterUserInterface;
        const page = request.metadata?.page || 1;
        const limit = request.metadata?.pageSize || 100;
        const offset = (page - 1) * limit;
        const conditions = buildBasePendingRegistrationConditions();

        if (params?.username) {
            conditions.push({
                column: `${USER_ALIAS}.username`,
                value: params.username,
                operator: OperatorTypes.LIKE,
            });
        }

        if (params?.email) {
            conditions.push({
                column: `${USER_ALIAS}.email`,
                value: params.email,
                operator: OperatorTypes.LIKE,
            });
        }

        if (params?.member_nik) {
            conditions.push({
                column: `${MEMBER_ALIAS}.nik`,
                value: params.member_nik,
                operator: OperatorTypes.LIKE,
            });
        }

        const queryParams: FindParams = {
            selectedColumns,
            joins: userJoins,
            conditions,
            limit,
            offset,
            order: {
                order_by: `${USER_ALIAS}.created_time`,
                order_dir: "DESC",
            },
        };

        const [data, total] = await Promise.all([
            findQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, queryParams),
            countQuery(`${tableNames.masterUser} ${USER_ALIAS}`, { conditions, joins: userJoins }),
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
        logger.error({ err: error }, "Registration list failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const getUserRegistrationService = async (request: MasterUserInterface) => {
    try {
        const data = await findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, {
            selectedColumns,
            joins: userJoins,
            conditions: [
                {
                    column: `${USER_ALIAS}.id`,
                    value: request.id,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: `${USER_ALIAS}.is_deleted`,
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
            ],
        });

        if (!data) {
            return { status: 404, message: locales.resource_not_found, data: null };
        }

        return { status: 200, message: locales.request_success, data };
    } catch (error) {
        logger.error({ err: error }, "Registration lookup failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const approveUserRegistrationService = async (request: MasterUserInterface) => {
    try {
        const auth = getCurrentAuth();
        const pendingUser = await findOneQuery<MasterUserInterface>(tableNames.masterUser, {
            selectedColumns: "id, role_id",
            conditions: [
                {
                    column: "id",
                    value: request.id,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: "registration_status",
                    value: "PENDING",
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: "is_deleted",
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
            ],
        });

        if (!pendingUser) {
            return { status: 404, message: locales.resource_not_found, data: null };
        }

        const residentRole = pendingUser.role_id ? null : await findDefaultResidentRole();
        if (!pendingUser.role_id && !residentRole?.id) {
            return { status: 400, message: "Role WARGA belum tersedia", data: null };
        }

        const updated = await updateQuery<MasterUserInterface>(
            tableNames.masterUser,
            {
                registration_status: "APPROVED",
                role_id: pendingUser.role_id || residentRole?.id,
                is_active: true,
                approved_time: new Date(),
                approved_by_id: auth?.user_id,
                rejected_time: null,
                rejected_by_id: null,
                rejection_note: null,
            },
            {
                id: request.id,
                registration_status: "PENDING",
            },
        );

        return { status: 200, message: locales.request_success, data: updated };
    } catch (error) {
        logger.error({ err: error }, "Registration approval failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const rejectUserRegistrationService = async (request: MasterUserInterface) => {
    try {
        const auth = getCurrentAuth();
        const updated = await updateQuery<MasterUserInterface>(
            tableNames.masterUser,
            {
                registration_status: "REJECTED",
                is_active: false,
                rejected_time: new Date(),
                rejected_by_id: auth?.user_id,
                rejection_note: request.rejection_note ?? null,
            },
            {
                id: request.id,
                registration_status: "PENDING",
            },
        );

        if (!updated) {
            return { status: 404, message: locales.resource_not_found, data: null };
        }

        return { status: 200, message: locales.request_success, data: updated };
    } catch (error) {
        logger.error({ err: error }, "Registration rejection failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};
