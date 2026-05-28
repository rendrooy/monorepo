import { locales, tableNames } from '../config';
import type { BaseRequest, BaseResponseDropdown } from "@monorepo/types";
import { findQuery, FindParams } from '../config/query/query-runner';
import { Condition, OperatorTypes } from '../config/query/query-builder';

const buildDropdown = (data: any[], valueKey: string, labelKey: string): BaseResponseDropdown[] =>
    data.map((item) => ({ value: item[valueKey], label: item[labelKey] }));

const baseConditions = (): Condition[] => [
    { column: "is_deleted", value: false, operator: OperatorTypes.EQUAL },
];

// ─── ROLE DROPDOWN ───────────────────────────────────────────────────────────

export const dropdownRoleService = async (request: BaseRequest) => {
    try {
        const search = (request.params as any)?.search ?? "";
        const conditions: Condition[] = baseConditions();
        if (search) {
            conditions.push({ column: "name", value: search, operator: OperatorTypes.LIKE });
        }

        const queryParams: FindParams = {
            selectedColumns: "id, name",
            conditions,
            limit: 100,
            offset: 0,
        };

        const data = await findQuery(tableNames.masterRole, queryParams);
        return {
            status: 200,
            message: locales.request_success,
            data: buildDropdown(data, "id", "name"),
        };
    } catch {
        return { status: 500, message: locales.unable_to_handle_request, data: [] };
    }
};

// ─── MEMBER DROPDOWN ─────────────────────────────────────────────────────────

export const dropdownMemberService = async (request: BaseRequest) => {
    try {
        const search = (request.params as any)?.search ?? "";
        const conditions: Condition[] = baseConditions();
        if (search) {
            conditions.push({ column: "name", value: search, operator: OperatorTypes.LIKE });
        }

        const queryParams: FindParams = {
            selectedColumns: "id, name",
            conditions,
            limit: 100,
            offset: 0,
        };

        const data = await findQuery(tableNames.masterMember, queryParams);
        return {
            status: 200,
            message: locales.request_success,
            data: buildDropdown(data, "id", "name"),
        };
    } catch {
        return { status: 500, message: locales.unable_to_handle_request, data: [] };
    }
};

// ─── USER DROPDOWN ───────────────────────────────────────────────────────────

export const dropdownUserService = async (request: BaseRequest) => {
    try {
        const search = (request.params as any)?.search ?? "";
        const conditions: Condition[] = baseConditions();
        if (search) {
            conditions.push({ column: "username", value: search, operator: OperatorTypes.LIKE });
        }

        const queryParams: FindParams = {
            selectedColumns: "id, username",
            conditions,
            limit: 100,
            offset: 0,
        };

        const data = await findQuery(tableNames.masterUser, queryParams);
        return {
            status: 200,
            message: locales.request_success,
            data: buildDropdown(data, "id", "username"),
        };
    } catch {
        return { status: 500, message: locales.unable_to_handle_request, data: [] };
    }
};

// ─── LEGACY (keep for backward compat) ───────────────────────────────────────
export const loadRoleService = dropdownRoleService;
