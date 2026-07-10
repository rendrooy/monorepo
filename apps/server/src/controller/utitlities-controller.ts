import { build } from "../controller/app-response";
import {
    dropdownFamilyRelationService,
    dropdownFamilyService,
    dropdownRoleService,
    dropdownMemberService,
    dropdownUserService
} from "../services/utilities-service";
import type { BaseRequest } from "@monorepo/types";
import type { Request, Response } from "express";

type DropdownRequest = BaseRequest<{ search?: string | null }>;
type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const getDropdownRole = async (req: RequestBody<DropdownRequest>, res: Response) => {
    build(res, await dropdownRoleService(req.body));
};

export const getDropdownMember = async (req: RequestBody<DropdownRequest>, res: Response) => {
    build(res, await dropdownMemberService(req.body));
};

export const getDropdownUser = async (req: RequestBody<DropdownRequest>, res: Response) => {
    build(res, await dropdownUserService(req.body));
};

export const getDropdownFamily = async (req: RequestBody<DropdownRequest>, res: Response) => {
    build(res, await dropdownFamilyService(req.body));
};

export const getDropdownFamilyRelation = async (_req: RequestBody<DropdownRequest>, res: Response) => {
    build(res, await dropdownFamilyRelationService());
};
