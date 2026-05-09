import { getUserService } from "../services/master-user-service";
import { build } from "./app-response";

export const getUser = async (req:any, res:any) => {
    build(res, await getUserService(req.body));
};
export const loadUser = async (req:any, res:any) => {
    build(res, await getUserService(req.body));
};
export const createUser = async (req:any, res:any) => {
    build(res, await getUserService(req.body));
};
export const updateUser = async (req:any, res:any) => {
    build(res, await getUserService(req.body));
};
export const deleteUser = async (req:any, res:any) => {
    build(res, await getUserService(req.body));
};