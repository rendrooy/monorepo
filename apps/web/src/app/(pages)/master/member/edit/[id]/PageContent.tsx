"use client";

import { MESSAGES } from "@/constants";
import { useApiService, useConfirmedAction } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type { BaseResponse, MasterMemberInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MemberForm } from "../../components/MemberForm";

function formatDateToInput(data?: string | null) {
    if (!data) return "";

    return new Date(data).toISOString().split("T")[0];
}

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id as string;
    const { callApi: callUpdateMember, loading: loadingUpdate } =
        useApiService("updateDataMember");
    const { callApi: callGetMemberById, loading: loadingGet } =
        useApiService("getDataMember");
    const [member, setMember] = useState<MasterMemberInterface>({});
    const canEdit = useMemo(
        () => canAccessRoute(getAuthMenu(), "master/member", "EDIT"),
        [],
    );

    useEffect(() => {
        if (!canEdit) {
            router.replace("/403");
        }
    }, [canEdit, router]);

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

    const handleSubmit = useCallback(
        async (values: MasterMemberInterface) => {
            if (!canEdit) {
                toast.error("Anda tidak memiliki akses untuk mengubah data ini.");
                return;
            }

            const toastId = toast.loading(MESSAGES.INFO.LOADING);

            await callUpdateMember(
                { ...values, id },
                {
                    onSuccess(data: BaseResponse) {
                        toast.success(data.message || MESSAGES.SUCCESS.UPDATE, { id: toastId });
                        router.back();
                    },
                    onError(error) {
                        toast.error(error?.message || MESSAGES.ERROR.UPDATE, { id: toastId });
                    },
                },
            );
        },
        [callUpdateMember, canEdit, id, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterMemberInterface>({
            action: "update",
            entityLabel: "warga",
            isLoading: loadingUpdate,
            onConfirm: handleSubmit,
        });

    useEffect(() => {
        getDataMember();
    }, [getDataMember]);

    return (
        <>
            <MemberForm
                initialValues={member}
                loading={loadingGet || loadingUpdate}
                title="Edit Data Warga"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
