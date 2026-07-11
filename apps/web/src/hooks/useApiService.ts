import type { ServiceKey, ServiceMapping } from "@/services/ServiceType";
import { clearAuthSession, getAccessToken } from "@/utils/auth-storage";
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
                const accessToken = getAccessToken();
                const response = await fetch(`http://localhost:3001/v1${endpoint}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify(body)
                })
                const responseText = await response.text();
                let responseData;
                try {
                    responseData = JSON.parse(responseText)
                } catch (error) {

                }
                const typedData = responseData as ServiceMapping[T]["response"]

                if (!response.ok) {
                    if (response.status === 401 && servicesKey !== "loginAuth") {
                        clearAuthSession();
                    }

                    const errorMessage = typedData?.message || "Request Error";
                    setState({
                        data: typedData,
                        loading: false,
                        error: errorMessage,
                    });
                    options.onError?.(typedData);
                    return typedData;
                }

                setState({
                    data: typedData,
                    loading: false,
                    error: null
                })
                options.onSuccess?.(typedData)
                return typedData;
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
        loginAuth: "/auth/login",
        registerAuth: "/auth/register",
        meAuth: "/auth/me",
        menuAuth: "/auth/menu",

        loadDataUserRegistration: "/operation/user-registration/load",
        getDataUserRegistration: "/operation/user-registration/get",
        approveDataUserRegistration: "/operation/user-registration/approve",
        rejectDataUserRegistration: "/operation/user-registration/reject",

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

        dropdownRole: "/utils/role",
        dropdownMember: "/utils/member",
        dropdownUser: "/utils/user",
        dropdownFamily: "/utils/family",
        dropdownFamilyRelation: "/utils/family-relation",

        loadIplBatch: "/operation/ipl/batch/load",
        getIplBatch: "/operation/ipl/batch/get",
        insertIplBatch: "/operation/ipl/batch/insert",
        updateIplBatch: "/operation/ipl/batch/update",
        publishIplBatch: "/operation/ipl/batch/publish",
        cancelIplBatch: "/operation/ipl/batch/cancel",
        loadIplBill: "/operation/ipl/bill/load",
        loadMyIplBill: "/operation/ipl/bill/my",
        loadNotification: "/notification/load",
        readNotification: "/notification/read",
        loadIplPayment: "/operation/ipl/payment/load",
        loadMyIplPayment: "/operation/ipl/payment/my",
        createIplPayment: "/operation/ipl/payment/create",
        approveIplPayment: "/operation/ipl/payment/approve",
        rejectIplPayment: "/operation/ipl/payment/reject",
        reverseIplPayment: "/operation/ipl/payment/reverse",
        getIplReportSummary: "/operation/ipl/report/summary",
        loadIplCreditLedger: "/operation/ipl/credit/load",
    }

    const url = endpoint[params];

    if (!url) {
        throw new Error(`Endpoint "${params}" tidak ditemukan`);
    }

    return url;
}
