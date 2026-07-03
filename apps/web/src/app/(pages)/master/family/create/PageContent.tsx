"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterFamilyInterface } from "@monorepo/types";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { FamilyForm } from "../components/FamilyForm";

const initialValues: MasterFamilyInterface = {
    no_kk: "",
    no_pbb: "",
    address: "",
    postal_code: "",
    status_adm: 1,
    status_dom: 1,
    is_active: true,
    member_id: "",
    member_ids: [],
    family_members: [],
};

export default function PageContent() {
    const router = useRouter();
    const { callApi, loading } = useApiService("insertDataFamily");

    const handleSubmit = useCallback(
        async (values: MasterFamilyInterface) => {
            await callApi(values, {
                onSuccess(data: BaseResponse) {
                    toast.success(data.message);
                    router.back();
                },
                onError(error) {
                    toast.error(error);
                },
            });
        },
        [callApi, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterFamilyInterface>({
            action: "create",
            entityLabel: "family",
            isLoading: loading,
            onConfirm: handleSubmit,
        });

    return (
        <>
            <FamilyForm
                title="Tambah Data Family"
                initialValues={initialValues}
                loading={loading}
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
