import type { BaseRequest, BaseResponse, MasterUserInterface } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface OperationUserRegistrationMapping {
    loadDataUserRegistration: ServiceStructure<{
        body: BaseRequest<MasterUserInterface>;
        response: BaseResponse<MasterUserInterface[]>;
    }>;
    getDataUserRegistration: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse<MasterUserInterface>;
    }>;
    approveDataUserRegistration: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse<MasterUserInterface>;
    }>;
    rejectDataUserRegistration: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse<MasterUserInterface>;
    }>;
}
