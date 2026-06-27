import {
    createMemberService,
    deleteMemberService,
    getMemberService,
    loadMemberService,
    updateMemberService
} from "../services/master-member-service";
import type { BaseRequest, MasterMemberInterface } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";

type RequestBody<T> = Request<Record<string, never>, unknown, T>;

export const getMember = async (req: RequestBody<MasterMemberInterface>, res: Response) => {
    build(res, await getMemberService(req.body));
};
export const loadMember = async (req: RequestBody<BaseRequest<MasterMemberInterface>>, res: Response) => {
    build(res, await loadMemberService(req.body));
};
export const createMember = async (req: RequestBody<MasterMemberInterface>, res: Response) => {
    build(res, await createMemberService(req.body));
};
export const updateMember = async (req: RequestBody<MasterMemberInterface>, res: Response) => {
    build(res, await updateMemberService(req.body));
};
export const deleteMember = async (req: RequestBody<MasterMemberInterface>, res: Response) => {
    build(res, await deleteMemberService(req.body));
};
