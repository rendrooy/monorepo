import { locales, tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import { findOneQuery, findQuery, insertQuery, type FindParams, type JoinClause } from "../config/query/query-runner";
import { OperatorTypes, type Condition } from "../config/query/query-builder";
import { signJwt } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { createNikLookupHash } from "../utils/nik-crypto";

import type {
    AuthLoginRequest,
    AuthLoginResponse,
    AuthMenuInterface,
    AuthMenuTreeInterface,
    AuthRegisterRequest,
    AuthTokenPayload,
    AuthUserInterface,
    BaseResponse,
    MasterMemberInterface,
    MasterRoleInterface,
    MasterUserInterface,
} from "@monorepo/types";

const USER_ALIAS = "u";
const ROLE_ALIAS = "r";
const MEMBER_ALIAS = "m";
const ROLE_PERMISSION_ALIAS = "rmp";
const MENU_ALIAS = "menu";
const TENANT_ALIAS = "t";
const READ_PERMISSION = 1;

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
    {
        type: "LEFT",
        table: tableNames.tenant,
        alias: TENANT_ALIAS,
        on: `${USER_ALIAS}.tenant_id = ${TENANT_ALIAS}.id AND ${TENANT_ALIAS}.is_deleted = false`,
    },
];

const authSelectedColumns = [
    `${USER_ALIAS}.id`,
    `${USER_ALIAS}.username`,
    `${USER_ALIAS}.email`,
    `${USER_ALIAS}.password`,
    `${USER_ALIAS}.role_id`,
    `${USER_ALIAS}.tenant_id`,
    `${ROLE_ALIAS}.name AS role_name`,
    `${ROLE_ALIAS}.code AS role_code`,
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
    `${TENANT_ALIAS}.name AS tenant_name`,
    `${TENANT_ALIAS}.status AS tenant_status`,
    `${USER_ALIAS}.registration_status`,
    `${USER_ALIAS}.is_active`,
    `${USER_ALIAS}.is_deleted`,
].join(", ");

const authUserSelectedColumns = [
    `${USER_ALIAS}.id`,
    `${USER_ALIAS}.username`,
    `${USER_ALIAS}.email`,
    `${USER_ALIAS}.role_id`,
    `${USER_ALIAS}.tenant_id`,
    `${ROLE_ALIAS}.name AS role_name`,
    `${ROLE_ALIAS}.code AS role_code`,
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
    `${TENANT_ALIAS}.name AS tenant_name`,
    `${TENANT_ALIAS}.status AS tenant_status`,
    `${USER_ALIAS}.registration_status`,
    `${USER_ALIAS}.is_active`,
].join(", ");

const toAuthUser = (user: MasterUserInterface): AuthUserInterface => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    role_code: user.role_code,
    member_id: user.member_id,
    member_name: user.member_name,
    tenant_id: user.tenant_id,
    tenant_name: user.tenant_name,
    tenant_status: user.tenant_status,
});

const MENU_FEATURES: Record<string, string> = {
    "1000": "FINANCIAL_REPORT_ENABLED",
    "2000": "IPL_ENABLED",
    "2100": "IPL_ENABLED",
    "2200": "IPL_ENABLED",
    "2300": "FINANCIAL_REPORT_ENABLED",
    "3000": "RESIDENT_DATABASE_ENABLED",
    "3100": "RESIDENT_DATABASE_ENABLED",
    "3200": "RESIDENT_DATABASE_ENABLED",
    "3300": "RESIDENT_DATABASE_ENABLED",
    "3400": "RESIDENT_DATABASE_ENABLED",
    "3500": "RESIDENT_DATABASE_ENABLED",
    "4100": "RESIDENT_DATABASE_ENABLED",
    "4200": "IPL_ENABLED",
    "4300": "UMKM_ADS_ENABLED",
    "4400": "GUEST_SECURITY_ENABLED",
    "5000": "UMKM_ADS_ENABLED",
    "5100": "UMKM_ADS_ENABLED",
    "5200": "UMKM_ADS_ENABLED",
    "5300": "UMKM_ADS_ENABLED",
    "6000": "GUEST_SECURITY_ENABLED",
    "6100": "GUEST_SECURITY_ENABLED",
    "6200": "GUEST_SECURITY_ENABLED",
    IPL: "IPL_ENABLED",
    IPL_PAYMENT_VERIFY: "IPL_ENABLED",
    IPL_REPORT: "FINANCIAL_REPORT_ENABLED",
    OP_BILL: "IPL_ENABLED",
    OP_IPL: "IPL_ENABLED",
    OP_UMKM: "UMKM_ADS_ENABLED",
    SECURITY: "GUEST_SECURITY_ENABLED",
    SECURITY_GUEST_GATE: "GUEST_SECURITY_ENABLED",
    SECURITY_GUEST_HISTORY: "GUEST_SECURITY_ENABLED",
    UMKM: "UMKM_ADS_ENABLED",
    UMKM_CONTENT_REVIEW: "UMKM_ADS_ENABLED",
    UMKM_PAYMENT_REVIEW: "UMKM_ADS_ENABLED",
    UMKM_SUBSCRIPTION_PLAN: "UMKM_ADS_ENABLED",
    OP_GUEST_REPORT: "GUEST_SECURITY_ENABLED",
};

const getMenuRowsByRoleId = async (roleId?: string | null, tenantId?: string | null) => {
    if (!roleId) {
        return [];
    }

    const menus = await findQuery<AuthMenuInterface>(
        `${tableNames.masterRoleMenuPermission} ${ROLE_PERMISSION_ALIAS}`,
        {
            selectedColumns: [
                `${MENU_ALIAS}.id`,
                `${MENU_ALIAS}.name`,
                `${MENU_ALIAS}.code`,
                `${MENU_ALIAS}.path_url`,
                `${MENU_ALIAS}.icon`,
                `${MENU_ALIAS}.menu_level`,
                `${MENU_ALIAS}.parent_id`,
                `${MENU_ALIAS}.sort_order`,
                `${ROLE_PERMISSION_ALIAS}.permission_mask`,
            ].join(", "),
            joins: [
                {
                    type: "INNER",
                    table: tableNames.masterMenu,
                    alias: MENU_ALIAS,
                    on: `${ROLE_PERMISSION_ALIAS}.menu_id = ${MENU_ALIAS}.id`,
                },
            ],
            conditions: [
                {
                    column: `${ROLE_PERMISSION_ALIAS}.role_id`,
                    value: roleId,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: `${ROLE_PERMISSION_ALIAS}.is_deleted`,
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: `${MENU_ALIAS}.is_deleted`,
                    value: false,
                    operator: OperatorTypes.EQUAL,
                },
                {
                    column: `${MENU_ALIAS}.is_active`,
                    value: true,
                    operator: OperatorTypes.EQUAL,
                },
            ],
            limit: 1000,
            order: {
                order_by: `${MENU_ALIAS}.sort_order`,
                order_dir: "ASC",
            },
        },
    );
    if (!tenantId) return menus;

    const result = await pool.query<{ code: string }>(
        `SELECT feature.code
         FROM ${tableNames.tenantSubscription} subscription
         INNER JOIN ${tableNames.platformPlanEntitlement} entitlement ON entitlement.plan_id=subscription.plan_id
         INNER JOIN ${tableNames.platformFeature} feature ON feature.id=entitlement.feature_id
         INNER JOIN ${tableNames.tenant} tenant ON tenant.id=subscription.tenant_id
         WHERE subscription.tenant_id=$1 AND subscription.status='ACTIVE' AND subscription.is_deleted=false
           AND tenant.status='ACTIVE' AND tenant.is_deleted=false AND entitlement.enabled=true`,
        [tenantId],
    );
    if (!result.rowCount) {
        return menus.filter((menu) => menu.code === "PLATFORM_BILLING");
    }
    const enabledFeatures = new Set(result.rows.map((row) => row.code));
    return menus.filter((menu) => {
        const feature = menu.code ? MENU_FEATURES[menu.code] : undefined;
        return !feature || enabledFeatures.has(feature);
    });
};

const canAccessTenantBilling = async (roleId?: string | null) => {
    if (!roleId) return false;
    const result = await pool.query(
        `SELECT 1 FROM ${tableNames.masterRoleMenuPermission} permission
         INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id
         WHERE permission.role_id=$1 AND menu.code='PLATFORM_BILLING'
           AND permission.is_active=true AND permission.is_deleted=false
           AND menu.is_active=true AND menu.is_deleted=false
           AND (permission.permission_mask & $2)=$2 LIMIT 1`,
        [roleId, 1],
    );
    return Boolean(result.rowCount);
};

const hasReadAccess = (menu: AuthMenuInterface) =>
    (Number(menu.permission_mask || 0) & READ_PERMISSION) === READ_PERMISSION;

const buildMenuTree = (menus: AuthMenuInterface[]): AuthMenuTreeInterface[] => {
    const menuMap = new Map<string, AuthMenuTreeInterface>();
    const readableMenuIds = new Set<string>();

    menus.forEach((menu) => {
        if (!menu.id || !menu.code || !menu.name) {
            return;
        }

        if (hasReadAccess(menu)) {
            readableMenuIds.add(menu.id);
        }

        const parent = menu.parent_id
            ? menus.find((item) => item.id === menu.parent_id)
            : null;

        menuMap.set(menu.id, {
            id: menu.id,
            menuCode: menu.code,
            menuName: menu.name,
            iconClass: menu.icon ?? null,
            menuLevel: String(menu.menu_level ?? ""),
            pathUrl: menu.path_url ?? "",
            parentCode: parent?.code ?? null,
            access: String(menu.permission_mask ?? 0),
            child: [],
        });
    });

    menus.forEach((menu) => {
        if (!menu.id || !menu.parent_id || !readableMenuIds.has(menu.id)) {
            return;
        }

        const parent = menuMap.get(menu.parent_id);
        const current = menuMap.get(menu.id);

        if (parent && current) {
            parent.child.push(current);
        }
    });

    return menus
        .filter((menu) => {
            if (!menu.id || menu.parent_id) {
                return false;
            }

            const current = menuMap.get(menu.id);
            return hasReadAccess(menu) || Boolean(current?.child.length);
        })
        .map((menu) => menuMap.get(menu.id!)!)
        .filter(Boolean);
};

const findUserByCredential = async (column: "username" | "email", value?: string | null) => {
    if (!value) {
        return null;
    }

    const conditions: Condition[] = [
        {
            column: `LOWER(${USER_ALIAS}.${column})`,
            value: value.toLowerCase(),
            operator: OperatorTypes.EQUAL,
        },
        {
            column: `${USER_ALIAS}.is_deleted`,
            value: false,
            operator: OperatorTypes.EQUAL,
        },
        {
            column: `${USER_ALIAS}.registration_status`,
            value: "APPROVED",
            operator: OperatorTypes.EQUAL,
        },
        {
            column: `${USER_ALIAS}.is_active`,
            value: true,
            operator: OperatorTypes.EQUAL,
        },
    ];

    const queryParams: FindParams = {
        selectedColumns: authSelectedColumns,
        joins: userJoins,
        conditions,
    };

    return findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, queryParams);
};

const findAnyUserByColumn = async (
    column: "username" | "email" | "member_id",
    value?: string | null,
    tenantId?: string | null,
) => {
    if (!value) {
        return null;
    }

    const conditions: Condition[] = [
        {
            column: `${USER_ALIAS}.${column}`,
            value,
            operator: OperatorTypes.EQUAL,
        },
        {
            column: `${USER_ALIAS}.is_deleted`,
            value: false,
            operator: OperatorTypes.EQUAL,
        },
    ];

    if (column === "member_id") {
        conditions.push(
            tenantId
                ? {
                    column: `${USER_ALIAS}.tenant_id`,
                    value: tenantId,
                    operator: OperatorTypes.EQUAL,
                }
                : {
                    column: `${USER_ALIAS}.tenant_id`,
                    operator: OperatorTypes.IS_NULL,
                },
        );
    }

    return findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, {
        selectedColumns: `${USER_ALIAS}.id, ${USER_ALIAS}.registration_status`,
        conditions,
    });
};

const findMemberByNik = async (nik?: string | null, tenantId?: string | null) => {
    if (!nik) {
        return null;
    }

    return findOneQuery<MasterMemberInterface>(tableNames.masterMember, {
        selectedColumns: "id, name",
        conditions: [
            {
                column: "nik_lookup_hash",
                value: createNikLookupHash(nik),
                operator: OperatorTypes.EQUAL,
            },
            {
                column: "is_deleted",
                value: false,
                operator: OperatorTypes.EQUAL,
            },
            tenantId
                ? {
                    column: "tenant_id",
                    value: tenantId,
                    operator: OperatorTypes.EQUAL,
                }
                : {
                    column: "tenant_id",
                    operator: OperatorTypes.IS_NULL,
                },
        ],
    });
};

const findTenantBySlug = async (slug?: string | null) => {
    if (!slug?.trim()) return null;
    return findOneQuery<{ id: string }>(tableNames.tenant, {
        selectedColumns: "id",
        conditions: [
            { column: "LOWER(slug)", value: slug.trim().toLowerCase(), operator: OperatorTypes.EQUAL },
            { column: "status", value: "ACTIVE", operator: OperatorTypes.EQUAL },
            { column: "is_active", value: true, operator: OperatorTypes.EQUAL },
            { column: "is_deleted", value: false, operator: OperatorTypes.EQUAL },
        ],
    });
};

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

export const registerService = async (
    request: AuthRegisterRequest,
): Promise<BaseResponse<MasterUserInterface | null>> => {
    try {
        const nik = request.nik?.trim();
        const username = request.username?.trim();
        const email = request.email?.trim();
        const password = request.password;
        const tenant = await findTenantBySlug(request.tenant_slug);

        if (request.tenant_slug && !tenant) {
            return { status: 404, message: "Tenant tidak ditemukan atau tidak aktif", data: null };
        }
        if (!request.tenant_slug && process.env.ALLOW_LEGACY_TENANTLESS_AUTH === "false") {
            return { status: 400, message: "Tenant wajib dipilih", data: null };
        }

        if (!nik || !username || !email || !password) {
            return { status: 400, message: "Data registrasi belum lengkap", data: null };
        }
        if (!/^\d{16}$/.test(nik)) {
            return { status: 400, message: "NIK harus terdiri dari 16 digit", data: null };
        }

        const member = await findMemberByNik(nik, tenant?.id);
        if (!member?.id) {
            return { status: 404, message: "NIK tidak terdaftar sebagai warga", data: null };
        }

        const existingMemberUser = await findAnyUserByColumn("member_id", member.id, tenant?.id);
        if (
            existingMemberUser?.registration_status === "PENDING" ||
            existingMemberUser?.registration_status === "APPROVED"
        ) {
            return { status: 409, message: "Warga ini sudah memiliki request atau akun aktif", data: null };
        }

        const existingUsername = await findAnyUserByColumn("username", username);
        if (existingUsername) {
            return { status: 409, message: "Username sudah digunakan", data: null };
        }

        const existingEmail = await findAnyUserByColumn("email", email);
        if (existingEmail) {
            return { status: 409, message: "Email sudah digunakan", data: null };
        }

        const residentRole = await findDefaultResidentRole();
        const newUser = await insertQuery<MasterUserInterface>(tableNames.masterUser, {
            username,
            email,
            password: hashPassword(password),
            member_id: member.id,
            tenant_id: tenant?.id ?? null,
            ...(residentRole?.id && { role_id: residentRole.id }),
            registration_status: "PENDING",
            is_active: false,
        });

        if (!newUser) {
            throw new Error("Failed to register user");
        }

        return {
            status: 201,
            message: "Registrasi berhasil dikirim. Menunggu persetujuan admin.",
            data: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                member_id: newUser.member_id,
                registration_status: newUser.registration_status,
                is_active: newUser.is_active,
            },
        };
    } catch (error) {
        logger.error({ err: error }, "User registration failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const loginService = async (
    request: AuthLoginRequest,
): Promise<BaseResponse<AuthLoginResponse | null>> => {
    try {
        const credential = request.username || request.email;
        const user =
            (await findUserByCredential("username", credential)) ||
            (await findUserByCredential("email", credential));

        if (!user || !verifyPassword(request.password, user.password)) {
            return { status: 401, message: locales.invalid_login, data: null };
        }

        if (!user.tenant_id && process.env.ALLOW_LEGACY_TENANTLESS_AUTH === "false") {
            return { status: 403, message: "Akun belum terhubung ke tenant", data: null };
        }

        if (user.tenant_id && !user.tenant_name) {
            return { status: 403, message: "Tenant akun tidak tersedia", data: null };
        }

        if (
            user.tenant_id &&
            user.tenant_status !== "ACTIVE" &&
            !(await canAccessTenantBilling(user.role_id))
        ) {
            return { status: 423, message: "Tenant sedang tidak aktif", data: null };
        }

        const authUser = toAuthUser(user);
        const menu = buildMenuTree(await getMenuRowsByRoleId(user.role_id, user.tenant_id));
        const accessToken = signJwt({
            sub: user.id ?? "",
            user_id: user.id ?? "",
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            role_code: user.role_code,
            tenant_id: user.tenant_id,
        });

        return {
            status: 200,
            message: locales.request_success,
            data: {
                access_token: accessToken,
                user: authUser,
                menu,
            },
        };
    } catch (error) {
        logger.error({ err: error }, "User login failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const meService = async (
    auth: AuthTokenPayload,
): Promise<BaseResponse<AuthUserInterface | null>> => {
    try {
        const conditions: Condition[] = [
            {
                column: `${USER_ALIAS}.id`,
                value: auth.user_id,
                operator: OperatorTypes.EQUAL,
            },
            {
                column: `${USER_ALIAS}.is_deleted`,
                value: false,
                operator: OperatorTypes.EQUAL,
            },
            {
                column: `${USER_ALIAS}.registration_status`,
                value: "APPROVED",
                operator: OperatorTypes.EQUAL,
            },
            {
                column: `${USER_ALIAS}.is_active`,
                value: true,
                operator: OperatorTypes.EQUAL,
            },
        ];

        if (auth.tenant_id) {
            conditions.push({
                column: `${USER_ALIAS}.tenant_id`,
                value: auth.tenant_id,
                operator: OperatorTypes.EQUAL,
            });
        }

        const user = await findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, {
            selectedColumns: authUserSelectedColumns,
            joins: userJoins,
            conditions,
        });

        if (!user) {
            return { status: 404, message: locales.resource_not_found, data: null };
        }

        return { status: 200, message: locales.request_success, data: toAuthUser(user) };
    } catch (error) {
        logger.error({ err: error }, "Current user lookup failed");
        return { status: 500, message: locales.unable_to_handle_request, data: null };
    }
};

export const authMenuService = async (
    auth: AuthTokenPayload,
): Promise<BaseResponse<AuthMenuTreeInterface[]>> => {
    try {
        const menus = await getMenuRowsByRoleId(auth.role_id, auth.tenant_id);

        return { status: 200, message: locales.request_success, data: buildMenuTree(menus) };
    } catch (error) {
        logger.error({ err: error }, "Authorized menu lookup failed");
        return { status: 500, message: locales.unable_to_handle_request, data: [] };
    }
};
