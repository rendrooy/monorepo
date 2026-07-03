"use client";

import { useApiService } from "@/hooks";
import type { MasterFamilyInterface } from "@monorepo/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

    return (
        <FamilyForm
            disabled
            title="Detail Data Family"
            initialValues={family}
            onBack={() => router.back()}
        />
    );
}
