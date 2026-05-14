import {
    createRoleService,
    deleteRoleService,
    getRoleService,
    loadRoleService,
    updateRoleService
} from "../services/master-role-service";
import { build } from "./app-response";

export const getRole = async (req:any, res:any) => {
    build(res, await getRoleService(req.body));
};
export const loadRole = async (req:any, res:any) => {
    build(res, await loadRoleService(req.body));
};
export const createRole = async (req:any, res:any) => {
    build(res, await createRoleService(req.body));
};
export const updateRole = async (req:any, res:any) => {
    build(res, await updateRoleService(req.body));
};
export const deleteRole = async (req:any, res:any) => {
    build(res, await deleteRoleService(req.body));
};