"use client";

import { useApiService } from "@/hooks";
import type { BaseResponse, MasterUserInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { UserForm } from "../../components/UserForm";

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id as string;
    const { callApi: callGetUser, loading } = useApiService("getDataUser");
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

    useEffect(() => {
        getUser();
    }, [getUser]);

    return (
        <UserForm
            disabled
            initialValues={user}
            loading={loading}
            requirePassword={false}
            title="Detail Data User"
            onBack={() => router.back()}
        />
    );
}
