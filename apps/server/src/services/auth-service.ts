import { locales, tableNames } from "../config";
import { findOneQuery, findQuery, type FindParams, type JoinClause } from "../config/query/query-runner";
import { OperatorTypes, type Condition } from "../config/query/query-builder";
import { signJwt } from "../utils/jwt";
import { verifyPassword } from "../utils/password";
import type {
    AuthLoginRequest,
    AuthLoginResponse,
    AuthMenuInterface,
    AuthMenuTreeInterface,
    AuthTokenPayload,
    AuthUserInterface,
    BaseResponse,
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
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
    `${USER_ALIAS}.is_deleted`,
].join(", ");

const authUserSelectedColumns = [
    `${USER_ALIAS}.id`,
    `${USER_ALIAS}.username`,
    `${USER_ALIAS}.email`,
    `${USER_ALIAS}.role_id`,
    `${ROLE_ALIAS}.name AS role_name`,
    `${USER_ALIAS}.member_id`,
    `${MEMBER_ALIAS}.name AS member_name`,
].join(", ");

const toAuthUser = (user: MasterUserInterface): AuthUserInterface => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
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
    ];

    const queryParams: FindParams = {
        selectedColumns: authSelectedColumns,
        joins: userJoins,
        conditions,
    };

    return findOneQuery<MasterUserInterface>(`${tableNames.masterUser} ${USER_ALIAS}`, queryParams);
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
        console.error("loginService error:", error);
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
            ],
        });

        if (!user) {
            return { status: 404, message: locales.resource_not_found, data: null };
        }

        return { status: 200, message: locales.request_success, data: toAuthUser(user) };
    } catch (error) {
        console.error("meService error:", error);
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
        console.error("authMenuService error:", error);
        return { status: 500, message: locales.unable_to_handle_request, data: [] };
    }
};
