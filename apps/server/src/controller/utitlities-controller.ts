import {build} from "../controller/app-response";
import {loadRoleService} from "../services/utilities-service";

export const getDropdownRole = async (req:any, res:any) => {
    build(res, await loadRoleService(req.body));
};