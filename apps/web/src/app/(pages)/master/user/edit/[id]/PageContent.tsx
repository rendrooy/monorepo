"use client";

import { useApiService, useConfirmedAction } from "@/hooks";
import type { BaseResponse, MasterUserInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserForm } from "../../components/UserForm";

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id as string;
    const { callApi: callGetUser, loading: loadingGet } = useApiService("getDataUser");
    const { callApi: callUpdateUser, loading: loadingUpdate } = useApiService("updateDataUser");
    const [user, setUser] = useState<MasterUserInterface>({});
    const loadedUserIdRef = useRef<string | null>(null);

    const getUser = useCallback(async () => {
        if (!id || loadedUserIdRef.current === id) return;

        loadedUserIdRef.current = id;

        await callGetUser(
            { id },
            {
                onSuccess(response: BaseResponse<MasterUserInterface>) {
                    setUser({
                        ...response.data,
                        password: "",
                    });
                },
                onError() {
                    loadedUserIdRef.current = null;
                    toast.error("Gagal memuat data user");
                },
            },
        );
    }, [callGetUser, id]);

    const handleSubmit = useCallback(async (values: MasterUserInterface) => {
        await callUpdateUser(
            {
                ...values,
                id,
                password: values.password || undefined,
            },
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
    }, [callUpdateUser, id, router]);

    const { confirmationDialog, requestConfirmation } =
        useConfirmedAction<MasterUserInterface>({
            action: "update",
            entityLabel: "user",
            isLoading: loadingUpdate,
            onConfirm: handleSubmit,
        });

    useEffect(() => {
        getUser();
    }, [getUser]);

    return (
        <>
            <UserForm
                initialValues={user}
                loading={loadingGet || loadingUpdate}
                requirePassword={false}
                title="Edit Data User"
                onBack={() => router.back()}
                onSubmit={requestConfirmation}
                submitText="Update"
            />
            {confirmationDialog}
        </>
    );
}
