import type {
    BaseRequest,
    BaseResponse,
    MasterFamilyInterface,
} from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface MasterFamilyMapping {
    loadDataFamily: ServiceStructure<{
        body: BaseRequest<MasterFamilyInterface>;
        response: BaseResponse<MasterFamilyInterface[]>;
    }>,
    getDataFamily: ServiceStructure<{
        body: MasterFamilyInterface;
        response: BaseResponse<MasterFamilyInterface>;
    }>,
    insertDataFamily: ServiceStructure<{
        body: MasterFamilyInterface;
        response: BaseResponse;
    }>,
    updateDataFamily: ServiceStructure<{
        body: MasterFamilyInterface;
        response: BaseResponse;
    }>,
    deleteDataFamily: ServiceStructure<{
        body: MasterFamilyInterface;
        response: BaseResponse;
    }>,
}
