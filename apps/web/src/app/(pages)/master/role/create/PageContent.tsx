"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterRoleInterface } from "@monorepo/types";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { RoleForm } from "../components/RoleForm";

export default function PageContent() {
    const router = useRouter();
    const { callApi: callCreateRole, loading: loadingCreate } =
        useApiService("insertDataRole");

    const handleSubmit = useCallback(
        async (values: MasterRoleInterface) => {
            await callCreateRole(
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
        [callCreateRole, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterRoleInterface>({
            action: "create",
            entityLabel: "role",
            isLoading: loadingCreate,
            onConfirm: handleSubmit,
        });

    return (
        <>
            <RoleForm
                initialValues={{}}
                loading={loadingCreate}
                title="Tambah Data Role"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
