import type { BaseRequest, BaseResponse, MasterUserInterface } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface MasterUserMapping {
    loadDataUser: ServiceStructure<{
        body: BaseRequest<MasterUserInterface>;
        response: BaseResponse<MasterUserInterface>
    }>,
    getDataUser: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse<MasterUserInterface>
    }>,
    insertDataUser: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse
    }>
    updateDataUser: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse
    }>
    deleteDataUser: ServiceStructure<{
        body: MasterUserInterface;
        response: BaseResponse
    }>
}