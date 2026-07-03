import type { BaseRequest, BaseResponse, BaseResponseDropdown } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface DropdownMapping {
    dropdownRole: ServiceStructure<{
        body: BaseRequest<{ search?: string }>;
        response: BaseResponse<BaseResponseDropdown[]>;
    }>;
    dropdownMember: ServiceStructure<{
        body: BaseRequest<{ search?: string; unassignedOnly?: boolean }>;
        response: BaseResponse<BaseResponseDropdown[]>;
    }>;
    dropdownUser: ServiceStructure<{
        body: BaseRequest<{ search?: string }>;
        response: BaseResponse<BaseResponseDropdown[]>;
    }>;
    dropdownFamily: ServiceStructure<{
        body: BaseRequest<{ search?: string }>;
        response: BaseResponse<BaseResponseDropdown[]>;
    }>;
    dropdownIplBill: ServiceStructure<{
        body: BaseRequest<{ search?: string }>;
        response: BaseResponse<BaseResponseDropdown[]>;
    }>;
    dropdownFamilyRelation: ServiceStructure<{
        body: BaseRequest;
        response: BaseResponse<BaseResponseDropdown[]>;
    }>;
}
