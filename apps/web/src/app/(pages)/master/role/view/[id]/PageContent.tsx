"use client";

import { useApiService } from "@/hooks";
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

    useEffect(() => {
        getRole();
    }, [getRole]);

    return (
        <RoleForm
            disabled
            initialValues={role}
            loading={loadingGet}
            title="Detail Data Role"
            onBack={() => router.back()}
        />
    );
}
