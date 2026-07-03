"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterRoleInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RoleForm } from "../../components/RoleForm";

export default function PageContent() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { callApi: callGetRole, loading: loadingGet } =
        useApiService("getDataRole");
    const { callApi: callUpdateRole, loading: loadingUpdate } =
        useApiService("updateDataRole");
    const [role, setRole] = useState<MasterRoleInterface>({});

    const getRole = useCallback(async () => {
        if (!id) return;

        await callGetRole(
            { id },
            {
                onSuccess(response: BaseResponse<MasterRoleInterface>) {
                    setRole(response.data ?? {});
                },
                onError(error) {
                    console.error("getDataRole error:", error);
                    toast.error("Gagal memuat data role");
                },
            },
        );
    }, [callGetRole, id]);

    const handleSubmit = useCallback(
        async (values: MasterRoleInterface) => {
            await callUpdateRole(
                { ...values, id },
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
        [callUpdateRole, id, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterRoleInterface>({
            action: "update",
            entityLabel: "role",
            isLoading: loadingUpdate,
            onConfirm: handleSubmit,
        });

    useEffect(() => {
        getRole();
    }, [getRole]);

    return (
        <>
            <RoleForm
                initialValues={role}
                loading={loadingGet || loadingUpdate}
                title="Edit Data Role"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
