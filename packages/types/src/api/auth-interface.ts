import type { MasterMenuInterface } from "./master-menu-interface";

export interface AuthLoginRequest {
    username?: string | null;
    email?: string | null;
    password?: string | null;
}

export interface AuthRegisterRequest {
    nik?: string | null;
    username?: string | null;
    email?: string | null;
    password?: string | null;
}

export interface AuthUserInterface {
    id?: string | null;
    username?: string | null;
    email?: string | null;
    role_id?: string | null;
    role_name?: string | null;
    role_code?: string | null;
    member_id?: string | null;
    member_name?: string | null;
}

export interface AuthLoginResponse {
    access_token: string;
    user: AuthUserInterface;
    menu: AuthMenuTreeInterface[];
}

export interface AuthTokenPayload {
    sub: string;
    user_id: string;
    username?: string | null;
    email?: string | null;
    role_id?: string | null;
    role_code?: string | null;
    iat?: number;
    exp?: number;
}

export interface AuthMenuInterface extends MasterMenuInterface {
    permission_mask?: number | null;
}

export interface AuthMenuTreeInterface {
    id: string;
    menuCode: string;
    menuName: string;
    iconClass: string | null;
    menuLevel: string;
    pathUrl: string;
    parentCode: string | null;
    access: string;
    child: AuthMenuTreeInterface[];
}
