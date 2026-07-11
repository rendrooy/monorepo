import type { AuthMapping, MasterUserMapping, MasterMemberMapping, MasterRoleMapping, MasterMenuMapping, MasterFamilyMapping, DropdownMapping, OperationUserRegistrationMapping, IplBillingMapping } from "./types";

export type ServiceMapping = AuthMapping & MasterUserMapping & MasterMemberMapping & MasterRoleMapping & MasterMenuMapping & MasterFamilyMapping & DropdownMapping & OperationUserRegistrationMapping & IplBillingMapping

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
