"use client";

import { useApiService } from "@/hooks";
import type { BaseResponse, MasterMenuInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MenuForm } from "../../components/MenuForm";

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id as string;
    const { callApi: callGetMenu, loading } = useApiService("getDataMenu");
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

    useEffect(() => {
        getMenu();
    }, [getMenu]);

    return (
        <MenuForm
            disabled
            initialValues={menu}
            loading={loading}
            title="Detail Data Menu"
            onBack={() => router.back()}
        />
    );
}
