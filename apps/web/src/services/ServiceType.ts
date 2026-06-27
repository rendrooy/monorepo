import type { MasterUserMapping, MasterMemberMapping, MasterRoleMapping, DropdownMapping, HomehubIplMapping } from "./types";

export type ServiceMapping = MasterUserMapping & MasterMemberMapping & MasterRoleMapping & DropdownMapping & HomehubIplMapping

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
