import type { AuthMapping, MasterUserMapping, MasterMemberMapping, MasterRoleMapping, MasterMenuMapping, MasterFamilyMapping, DropdownMapping, OperationUserRegistrationMapping, IplBillingMapping, UmkmMapping, GuestVisitMapping, PlatformBillingMapping } from "./types";

export type ServiceMapping = AuthMapping & MasterUserMapping & MasterMemberMapping & MasterRoleMapping & MasterMenuMapping & MasterFamilyMapping & DropdownMapping & OperationUserRegistrationMapping & IplBillingMapping & UmkmMapping & GuestVisitMapping & PlatformBillingMapping

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
