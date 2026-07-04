import type { AuthMapping, MasterUserMapping, MasterMemberMapping, MasterRoleMapping, MasterMenuMapping, DropdownMapping, HomehubIplMapping } from "./types";

export type ServiceMapping = AuthMapping & MasterUserMapping & MasterMemberMapping & MasterRoleMapping & MasterMenuMapping & DropdownMapping & HomehubIplMapping

export type ServiceKey = keyof ServiceMapping;

interface ServiceRequestProps {
    queryParams?: unknown
    body?: unknown
    response?: unknown
    pathParams?: unknown
}

export interface ServiceStructure<T extends ServiceRequestProps> {
    queryParams?: T['queryParams'];
    body?: T['body'];
    response?: T['response'];
    pathParams?: T['pathParams'];
}
