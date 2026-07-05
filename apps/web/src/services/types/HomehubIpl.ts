import type {
    BaseRequest,
    BaseResponse,
    CashReportInterface,
    ExpenseInterface,
    IplBillInterface,
    IplDashboardInterface,
    IplDashboardRequest,
    IplGenerateBillRequest,
    IplGenerateBillResult,
    IplPaymentInterface,
    IplSettingInterface,
    MasterFamilyInterface,
    ResidentDashboardInterface,
} from "@monorepo/types";
import type { ServiceStructure } from "../ServiceType";

export interface HomehubIplMapping {
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

    loadDataIplSetting: ServiceStructure<{
        body: BaseRequest<IplSettingInterface>;
        response: BaseResponse<IplSettingInterface[]>;
    }>,
    insertDataIplSetting: ServiceStructure<{
        body: IplSettingInterface;
        response: BaseResponse;
    }>,
    updateDataIplSetting: ServiceStructure<{
        body: IplSettingInterface;
        response: BaseResponse;
    }>,

    loadDataIplBill: ServiceStructure<{
        body: BaseRequest<IplBillInterface>;
        response: BaseResponse<IplBillInterface[]>;
    }>,
    generateDataIplBill: ServiceStructure<{
        body: IplGenerateBillRequest;
        response: BaseResponse<IplGenerateBillResult>;
    }>,
    updateDataIplBill: ServiceStructure<{
        body: IplBillInterface;
        response: BaseResponse;
    }>,
    deleteDataIplBill: ServiceStructure<{
        body: IplBillInterface;
        response: BaseResponse;
    }>,

    loadDataIplPayment: ServiceStructure<{
        body: BaseRequest<IplPaymentInterface>;
        response: BaseResponse<IplPaymentInterface[]>;
    }>,
    insertDataIplPayment: ServiceStructure<{
        body: IplPaymentInterface;
        response: BaseResponse;
    }>,
    deleteDataIplPayment: ServiceStructure<{
        body: IplPaymentInterface;
        response: BaseResponse;
    }>,

    getDataIplDashboard: ServiceStructure<{
        body: IplDashboardRequest;
        response: BaseResponse<IplDashboardInterface>;
    }>,
    getDataCashReport: ServiceStructure<{
        body: IplDashboardRequest;
        response: BaseResponse<CashReportInterface>;
    }>,
    getDataResidentDashboard: ServiceStructure<{
        body: Record<string, never>;
        response: BaseResponse<ResidentDashboardInterface | null>;
    }>,
    loadDataExpense: ServiceStructure<{
        body: BaseRequest<ExpenseInterface>;
        response: BaseResponse<ExpenseInterface[]>;
    }>,
    insertDataExpense: ServiceStructure<{
        body: ExpenseInterface;
        response: BaseResponse;
    }>,
    deleteDataExpense: ServiceStructure<{
        body: ExpenseInterface;
        response: BaseResponse;
    }>,
}
