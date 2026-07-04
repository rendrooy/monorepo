import type { ServiceKey, ServiceMapping } from "@/services/ServiceType";
import { useCallback, useState } from "react";

interface ApiServiceState<T> {
    data: T | null;
    loading: boolean;
    error: string | null
}

interface CallApiOptions {
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    onFinally?: () => void;
}

function getEmptyResponse<T extends ServiceKey>(): ServiceMapping[T]['response'] {
    return {
        data: {},
        message: "No Data Available",
    }
}

export function useApiService<T extends ServiceKey>(servicesKey: T) {
    const [state, setState] = useState<ApiServiceState<ServiceMapping[T]['response']>>(
        {
            data: getEmptyResponse(),
            loading: false,
            error: null
        }
    )

    const callApi = useCallback(
        async (body: ServiceMapping[T]["body"], options: CallApiOptions = {}) => {
            try {
                setState((prev) => ({ ...prev, loading: true }));
                const endpoint = getEndpointServiceKey(servicesKey)
                const response = await fetch(`http://localhost:3001/v1${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                })
                const responseText = await response.text();
                let responseData;
                try {
                    responseData = JSON.parse(responseText)
                } catch (error) {

                }
                const typedData = responseData as ServiceMapping[T]["response"]

                setState({
                    data: typedData,
                    loading: false,
                    error: null
                })
                options.onSuccess?.(typedData)
            } catch {
                const errorMessage = "Network Error"
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: errorMessage,
                    data: getEmptyResponse()
                }))
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []
    )

    return {
        ...state,
        callApi,
        reset: () => {
            setState(() => ({
                data: getEmptyResponse(),
                error: null,
                loading: false
            }))
        }
    }

}

function getEndpointServiceKey(params: string): string {
    const endpoint: Record<string, string> = {
        loadDataUser: "/master/user/load",
        getDataUser: "/master/user/get",
        insertDataUser: "/master/user/insert",
        updateDataUser: "/master/user/update",
        deleteDataUser: "/master/user/delete",

        loadDataMember: "/master/member/load",
        getDataMember: "/master/member/get",
        insertDataMember: "/master/member/insert",
        updateDataMember: "/master/member/update",
        deleteDataMember: "/master/member/delete",

        loadDataRole: "/master/role/load",
        getDataRole: "/master/role/get",
        insertDataRole: "/master/role/insert",
        updateDataRole: "/master/role/update",
        deleteDataRole: "/master/role/delete",

        loadDataMenu: "/master/menu/load",
        getDataMenu: "/master/menu/get",
        insertDataMenu: "/master/menu/insert",
        updateDataMenu: "/master/menu/update",
        deleteDataMenu: "/master/menu/delete",

        loadDataFamily: "/master/family/load",
        getDataFamily: "/master/family/get",
        insertDataFamily: "/master/family/insert",
        updateDataFamily: "/master/family/update",
        deleteDataFamily: "/master/family/delete",

        loadDataIplSetting: "/ipl/setting/load",
        insertDataIplSetting: "/ipl/setting/insert",
        updateDataIplSetting: "/ipl/setting/update",

        loadDataIplBill: "/ipl/bill/load",
        generateDataIplBill: "/ipl/bill/generate",
        updateDataIplBill: "/ipl/bill/update",
        deleteDataIplBill: "/ipl/bill/delete",

        loadDataIplPayment: "/ipl/payment/load",
        insertDataIplPayment: "/ipl/payment/insert",
        deleteDataIplPayment: "/ipl/payment/delete",

        getDataIplDashboard: "/ipl/dashboard",
        getDataCashReport: "/ipl/cash-report",
        loadDataExpense: "/ipl/expense/load",
        insertDataExpense: "/ipl/expense/insert",
        deleteDataExpense: "/ipl/expense/delete",

        dropdownRole: "/utils/role",
        dropdownMember: "/utils/member",
        dropdownUser: "/utils/user",
        dropdownFamily: "/utils/family",
        dropdownIplBill: "/utils/ipl-bill",
        dropdownFamilyRelation: "/utils/family-relation",
    }

    const url = endpoint[params];

    if (!url) {
        throw new Error(`Endpoint "${params}" tidak ditemukan`);
    }

    return url;
}
