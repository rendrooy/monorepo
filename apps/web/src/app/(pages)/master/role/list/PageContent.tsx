"use client"

import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import type { MasterRoleInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function PageContent() {
    const [listData, setListData] = useState<MasterRoleInterface[]>([]);
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });
    const { callApi: callRoleDataList, loading: loadingRoleDataList } =
        useApiService("loadDataRole");
    /**
         * 🔥 Fetch Data
         */
    const handleGetList = useCallback(
        async (params: Partial<MasterRoleInterface>, pagination: Metadata) => {
            await callRoleDataList(
                {
                    params,
                    metadata: pagination,
                },
                {
                    onSuccess(response) {
                        setListData(response.data ?? []);
                        setMeta((prev) => ({
                            ...prev,
                            total: response.metaData?.total ?? 0,
                        }));
                    },
                    onError(error) {
                        console.error("loadDataRole error:", error);
                    },
                }
            );
        },
        [callRoleDataList]
    );

    const [filterParams, setFilterParams] =
        useState<Partial<MasterRoleInterface>>({});
    function handleNavigation(type: string, item: any | null) {
        console.info(item.id)
    }
    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize]);
    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Role Management</h1>
                    <p className="text-gray-600">
                        Di halaman ini, Anda dapat mengelola data role pengguna.
                    </p>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardContent className="pt-6">
                    <Button
                        onClick={() => { }}
                        variant={"outline"}
                    >
                        <Plus />
                        Tambah Data
                    </Button>
                    <AppDataTable
                        columns={[
                            {
                                field: "code",
                                header: "Code",
                                sortable: true,
                                skeletonWidth: "60%",
                            },
                            {
                                field: "name",
                                header: "Name",
                                sortable: true,
                                skeletonWidth: "80%",
                            },
                            {
                                field: "desc",
                                header: "Description",
                                skeletonWidth: "100%",
                            },
                        ]}
                        data={listData}
                        loading={loadingRoleDataList}
                        meta={meta}
                        onMetaChange={setMeta}
                        onEdit={(row) => handleNavigation("UPDATE", row)}
                        onDelete={(row) => handleNavigation("DELETE", row)}
                    />
                </CardContent>
            </Card>

        </div>
    )
}