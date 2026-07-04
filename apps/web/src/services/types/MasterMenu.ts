import type { BaseRequest, BaseResponse, MasterMenuInterface } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface MasterMenuMapping {
    loadDataMenu: ServiceStructure<{
        body: BaseRequest<MasterMenuInterface>;
        response: BaseResponse<MasterMenuInterface[]>;
    }>;
    getDataMenu: ServiceStructure<{
        body: MasterMenuInterface;
        response: BaseResponse<MasterMenuInterface>;
    }>;
    insertDataMenu: ServiceStructure<{
        body: MasterMenuInterface;
        response: BaseResponse;
    }>;
    updateDataMenu: ServiceStructure<{
        body: MasterMenuInterface;
        response: BaseResponse;
    }>;
    deleteDataMenu: ServiceStructure<{
        body: MasterMenuInterface;
        response: BaseResponse;
    }>;
}
