import type { BaseRequest, BaseResponse, MasterRoleInterface } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface MasterRoleMapping {
    loadDataRole: ServiceStructure<{
        body: BaseRequest<MasterRoleInterface>;
        response: BaseResponse<MasterRoleInterface>;
    }>;
    getDataRole: ServiceStructure<{
        body: MasterRoleInterface;
        response: BaseResponse<MasterRoleInterface>;
    }>;
    insertDataRole: ServiceStructure<{
        body: MasterRoleInterface;
        response: BaseResponse;
    }>;
    updateDataRole: ServiceStructure<{
        body: MasterRoleInterface;
        response: BaseResponse;
    }>;
    deleteDataRole: ServiceStructure<{
        body: MasterRoleInterface;
        response: BaseResponse;
    }>;
}
