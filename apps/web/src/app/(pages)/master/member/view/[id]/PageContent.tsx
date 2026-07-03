"use client";

import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import type { BaseResponse, MasterMemberInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MemberForm } from "../../components/MemberForm";

function formatDateToInput(data?: string | null) {
    if (!data) return "";

    return new Date(data).toISOString().split("T")[0];
}

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id as string;
    const { callApi: callGetMemberById, loading: loadingGet } =
        useApiService("getDataMember");
    const [member, setMember] = useState<MasterMemberInterface>({});

    const getDataMember = useCallback(async () => {
        if (!id) return;

        await callGetMemberById(
            { id },
            {
                onSuccess(response: BaseResponse<MasterMemberInterface>) {
                    const values = response.data ?? {};
                    setMember({
                        ...values,
                        bod: formatDateToInput(values.bod),
                    });
                },
                onError() {
                    toast.error(MESSAGES.ERROR.GENERAL);
                },
            },
        );
    }, [callGetMemberById, id]);

    useEffect(() => {
        getDataMember();
    }, [getDataMember]);

    return (
        <MemberForm
            disabled
            initialValues={member}
            loading={loadingGet}
            title="Detail Data Warga"
            onBack={() => router.back()}
        />
    );
}
