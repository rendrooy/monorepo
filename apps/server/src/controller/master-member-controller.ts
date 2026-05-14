import {
    createMemberService,
    deleteMemberService,
    getMemberService,
    loadMemberService,
    updateMemberService
} from "../services/master-member-service";
import { build } from "./app-response";

export const getMember = async (req:any, res:any) => {
    build(res, await getMemberService(req.body));
};
export const loadMember = async (req:any, res:any) => {
    build(res, await loadMemberService(req.body));
};
export const createMember = async (req:any, res:any) => {
    build(res, await createMemberService(req.body));
};
export const updateMember = async (req:any, res:any) => {
    build(res, await updateMemberService(req.body));
};
export const deleteMember = async (req:any, res:any) => {
    build(res, await deleteMemberService(req.body));
};