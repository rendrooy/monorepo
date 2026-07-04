"use client";

import { MESSAGES } from "@/constants";
import { useApiService, useConfirmedAction } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type { BaseResponse, MasterMemberInterface } from "@monorepo/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { MemberForm } from "../components/MemberForm";

export default function PageContent() {
    const router = useRouter();
    const { callApi: callCreateMember, loading: loadingCreate } =
        useApiService("insertDataMember");
    const canCreate = useMemo(
        () => canAccessRoute(getAuthMenu(), "master/member", "ADD"),
        [],
    );

    useEffect(() => {
        if (!canCreate) {
            router.replace("/403");
        }
    }, [canCreate, router]);

    const handleSubmit = useCallback(
        async (values: MasterMemberInterface) => {
            if (!canCreate) {
                toast.error("Anda tidak memiliki akses untuk menambahkan data ini.");
                return;
            }

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
        [callCreateMember, canCreate, router],
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
