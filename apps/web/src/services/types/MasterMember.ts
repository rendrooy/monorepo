import type { BaseRequest, BaseResponse, MasterMemberInterface } from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface MasterMemberMapping {
    loadDataMember: ServiceStructure<{
        body: BaseRequest<MasterMemberInterface>;
        response: BaseResponse<MasterMemberInterface>
    }>,
    getDataMember: ServiceStructure<{
        body: MasterMemberInterface;
        response: BaseResponse<MasterMemberInterface>
    }>,
    insertDataMember: ServiceStructure<{
        body: MasterMemberInterface;
        response: BaseResponse
    }>
    updateDataMember: ServiceStructure<{
        body: MasterMemberInterface;
        response: BaseResponse
    }>
    deleteDataMember: ServiceStructure<{
        body: MasterMemberInterface;
        response: BaseResponse
    }>
}