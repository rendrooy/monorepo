"use client";

import { MESSAGES } from "@/constants";
import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterMemberInterface } from "@monorepo/types";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { MemberForm } from "../components/MemberForm";

export default function PageContent() {
    const router = useRouter();
    const { callApi: callCreateMember, loading: loadingCreate } =
        useApiService("insertDataMember");

    const handleSubmit = useCallback(
        async (values: MasterMemberInterface) => {
            const toastId = toast.loading(MESSAGES.INFO.LOADING);

            await callCreateMember(
                { ...values },
                {
                    onSuccess(data: BaseResponse) {
                        toast.success(data.message || MESSAGES.SUCCESS.INSERT, { id: toastId });
                        router.back();
                    },
                    onError(error) {
                        toast.error(error?.message || MESSAGES.ERROR.INSERT, { id: toastId });
                    },
                },
            );
        },
        [callCreateMember, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterMemberInterface>({
            action: "create",
            entityLabel: "warga",
            isLoading: loadingCreate,
            onConfirm: handleSubmit,
        });

    return (
        <>
            <MemberForm
                initialValues={{}}
                loading={loadingCreate}
                title="Tambah Data Warga"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
