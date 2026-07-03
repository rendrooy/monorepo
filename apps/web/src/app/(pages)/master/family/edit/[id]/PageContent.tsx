"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterFamilyInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FamilyForm } from "../../components/FamilyForm";

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
    const params = useParams();
    const id = params?.id as string;
    const [family, setFamily] = useState<MasterFamilyInterface>(initialValues);
    const { callApi: callGet } = useApiService("getDataFamily");
    const { callApi: callUpdate, loading } = useApiService("updateDataFamily");

    useEffect(() => {
        if (!id) return;

        callGet(
            { id },
            {
                onSuccess(response) {
                    setFamily({
                        ...initialValues,
                        ...(response.data as MasterFamilyInterface),
                    });
                },
                onError() {
                    toast.error("Gagal memuat data family");
                },
            },
        );
    }, [callGet, id]);

    const handleSubmit = useCallback(
        async (values: MasterFamilyInterface) => {
            await callUpdate(
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
        [callUpdate, id, router],
    );

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterFamilyInterface>({
            action: "update",
            entityLabel: "family",
            isLoading: loading,
            onConfirm: handleSubmit,
        });

    return (
        <>
            <FamilyForm
                title="Edit Data Family"
                initialValues={family}
                loading={loading}
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
                submitText="Update"
            />
            {confirmationDialog}
        </>
    );
}
