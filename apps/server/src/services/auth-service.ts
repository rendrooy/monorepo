import { locales, tableNames } from "../config";
import { logger } from "../config/logger";
import { findOneQuery, findQuery, insertQuery, type FindParams, type JoinClause } from "../config/query/query-runner";
import { OperatorTypes, type Condition } from "../config/query/query-builder";
import { signJwt } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
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
];

const authSelectedColumns = [
    `${USER_ALIAS}.id`,
    `${USER_ALIAS}.username`,
    `${USER_ALIAS}.email`,
    `${USER_ALIAS}.password`,
    `${USER_ALIAS}.role_id`,
    `${ROLE_ALIAS}.name AS role_name`,
    `${ROLE_ALIAS}.code AS role_code`,
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
    `${USER_ALIAS}.registration_status`,
    `${USER_ALIAS}.is_active`,
    `${USER_ALIAS}.is_deleted`,
].join(", ");

const authUserSelectedColumns = [
    `${USER_ALIAS}.id`,
    `${USER_ALIAS}.username`,
    `${USER_ALIAS}.email`,
    `${USER_ALIAS}.role_id`,
    `${ROLE_ALIAS}.name AS role_name`,
    `${ROLE_ALIAS}.code AS role_code`,
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
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
});

const getMenuRowsByRoleId = async (roleId?: string | null) => {
    if (!roleId) {
        return [];
    }

    return findQuery<AuthMenuInterface>(
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
            column: `${USER_ALIAS}.${column}`,
            value,
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

const findAnyUserByColumn = async (column: "username" | "email" | "member_id", value?: string | null) => {
    if (!value) {
        return null;
    }

    return findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, {
        selectedColumns: `${USER_ALIAS}.id, ${USER_ALIAS}.registration_status`,
        conditions: [
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
        ],
    });
};

const findMemberByNik = async (nik?: string | null) => {
    if (!nik) {
        return null;
    }

    return findOneQuery<MasterMemberInterface>(tableNames.masterMember, {
        selectedColumns: "id, nik, name",
        conditions: [
            {
                column: "nik",
                value: nik,
                operator: OperatorTypes.EQUAL,
            },
            {
                column: "is_deleted",
                value: false,
                operator: OperatorTypes.EQUAL,
            },
        ],
    });
};

const findDefaultResidentRole = async () =>
    findOneQuery<MasterRoleInterface>(tableNames.masterRole, {
        selectedColumns: "id, code, name",
        conditions: [
            {
                column: "code",
                value: "WARGA",
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

        if (!nik || !username || !email || !password) {
            return { status: 400, message: "Data registrasi belum lengkap", data: null };
        }

        const member = await findMemberByNik(nik);
        if (!member?.id) {
            return { status: 404, message: "NIK tidak terdaftar sebagai warga", data: null };
        }

        const existingMemberUser = await findAnyUserByColumn("member_id", member.id);
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

        const authUser = toAuthUser(user);
        const menu = buildMenuTree(await getMenuRowsByRoleId(user.role_id));
        const accessToken = signJwt({
            sub: user.id ?? "",
            user_id: user.id ?? "",
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            role_code: user.role_code,
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
        const user = await findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, {
            selectedColumns: authUserSelectedColumns,
            joins: userJoins,
            conditions: [
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
            ],
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
        const menus = await getMenuRowsByRoleId(auth.role_id);

        return { status: 200, message: locales.request_success, data: buildMenuTree(menus) };
    } catch (error) {
        logger.error({ err: error }, "Authorized menu lookup failed");
        return { status: 500, message: locales.unable_to_handle_request, data: [] };
    }
};
