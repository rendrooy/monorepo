import { build } from "../controller/app-response";
import { dropdownRoleService, dropdownMemberService, dropdownUserService } from "../services/utilities-service";

export const getDropdownRole = async (req: any, res: any) => {
    build(res, await dropdownRoleService(req.body));
};

export const getDropdownMember = async (req: any, res: any) => {
    build(res, await dropdownMemberService(req.body));
};

export const getDropdownUser = async (req: any, res: any) => {
    build(res, await dropdownUserService(req.body));
};
