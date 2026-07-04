"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterMenuInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MenuForm } from "../../components/MenuForm";

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id as string;
    const { callApi: callGetMenu, loading: loadingGet } = useApiService("getDataMenu");
    const { callApi: callUpdateMenu, loading: loadingUpdate } = useApiService("updateDataMenu");
    const [menu, setMenu] = useState<MasterMenuInterface>({});
    const loadedMenuIdRef = useRef<string | null>(null);

    const getMenu = useCallback(async () => {
        if (!id || loadedMenuIdRef.current === id) return;

        loadedMenuIdRef.current = id;

        await callGetMenu(
            { id },
            {
                onSuccess(response: BaseResponse<MasterMenuInterface>) {
                    setMenu(response.data ?? {});
                },
                onError() {
                    loadedMenuIdRef.current = null;
                    toast.error("Gagal memuat data menu");
                },
            },
        );
    }, [callGetMenu, id]);

    const handleSubmit = useCallback(async (values: MasterMenuInterface) => {
        await callUpdateMenu(
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
    }, [callUpdateMenu, id, router]);

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterMenuInterface>({
            action: "update",
            entityLabel: "menu",
            isLoading: loadingUpdate,
            onConfirm: handleSubmit,
        });

    useEffect(() => {
        getMenu();
    }, [getMenu]);

    return (
        <>
            <MenuForm
                initialValues={menu}
                loading={loadingGet || loadingUpdate}
                title="Edit Data Menu"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
                submitText="Update"
            />
            {confirmationDialog}
        </>
    );
}
