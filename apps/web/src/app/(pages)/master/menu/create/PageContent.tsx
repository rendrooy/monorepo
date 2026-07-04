"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterMenuInterface } from "@monorepo/types";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { MenuForm } from "../components/MenuForm";

export default function PageContent() {
    const router = useRouter();
    const { callApi: callCreateMenu, loading } = useApiService("insertDataMenu");

    const handleSubmit = useCallback(async (values: MasterMenuInterface) => {
        await callCreateMenu(values, {
            onSuccess(data: BaseResponse) {
                toast.success(data.message);
                router.back();
            },
            onError(error) {
                toast.error(error);
            },
        });
    }, [callCreateMenu, router]);

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterMenuInterface>({
            action: "create",
            entityLabel: "menu",
            isLoading: loading,
            onConfirm: handleSubmit,
        });

    return (
        <>
            <MenuForm
                initialValues={{}}
                loading={loading}
                title="Tambah Data Menu"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
            />
            {confirmationDialog}
        </>
    );
}
