"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterUserInterface } from "@monorepo/types";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { UserForm } from "../components/UserForm";

export default function PageContent() {
    const router = useRouter();
    const { callApi: callCreateUser, loading: loadingCreate } =
        useApiService("insertDataUser");

    const handleSubmit = useCallback(
        async (values: MasterUserInterface) => {
            await callCreateUser(
                { ...values },
                {
                    onSuccess(data: BaseResponse) {
                        toast.success(data.message);
                        router.back();
                    },
                    onError(error) {
                        toast.error(error);
                    },
                },
            );
        },
        [callCreateUser, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterUserInterface>({
            action: "create",
            entityLabel: "user",
            isLoading: loadingCreate,
            onConfirm: handleSubmit,
        });

    return (
        <>
            <UserForm
                initialValues={{}}
                loading={loadingCreate}
                title="Tambah Data User"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
