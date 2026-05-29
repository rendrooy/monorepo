"use client"


import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { useApiService } from "@/hooks";
import type { MasterMemberInterface, MasterRoleInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

export default function PageContent() {
    const router = useRouter();
    const [listData, setListData] = useState<MasterMemberInterface[]>([]);
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { callApi: callMemberDataList, loading: loadingMemberDataList } =
        useApiService("loadDataMember");
    /**
         * 🔥 Fetch Data
         */
    const handleGetList = useCallback(
        async (params: Partial<MasterMemberInterface>, pagination: Metadata) => {
            await callMemberDataList(
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
        []
    );

    const [filterParams, setFilterParams] =
        useState<Partial<MasterMemberInterface>>({});


    const filterForm = useFormik<MasterMemberInterface>({
        initialValues: {
            name: "",
            nik: "",
            religion: "",
        },
        onSubmit: () => { }
    });

    function handleNavigation(type: string, item: MasterMemberInterface | null) {
        // setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/member/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/member/edit/${item?.id}`);
        else if (type === "DETAIL") router.push(`../master/member/view/${item?.id}`);
    }

    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize, meta.sortBy, meta.sortDir, filterParams]);
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

            <FilterPanel
                onSubmit={() => { setFilterParams(filterForm.values) }}
                onReset={() => {
                    filterForm.resetForm();
                    setFilterParams({});
                }}>
                <div>
                    <Label>
                        Nama
                    </Label>
                    <Input
                        id="name"
                        className="mt-2"
                        value={filterForm.values.name ?? ""}
                        placeholder="Masukan Filter Nama"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>
                        NIK
                    </Label>
                    <Input
                        id="nik"
                        className="mt-2"
                        value={filterForm.values.nik ?? ""}
                        placeholder="Masukan Filter NIK"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>
                        Agama
                    </Label>
                    <Input
                        id="religion"
                        className="mt-2"
                        value={filterForm.values.religion ?? ""}
                        placeholder="Masukan Filter Agama"
                        onChange={filterForm.handleChange}
                    />
                </div>
            </FilterPanel>

            <Card className="mt-6">
                <CardContent className="pt-6">
                    <Button
                        onClick={() => { handleNavigation("CREATE", null) }}
                        variant={"outline"}
                    >
                        <Plus />
                        Tambah Data
                    </Button>
                    <AppDataTable
                        columns={[
                            {
                                field: "name",
                                header: "Name",
                                sortable: true,
                                skeletonWidth: "60%",
                            },
                            {
                                field: "nik",
                                header: "NIK",
                                sortable: true,
                                skeletonWidth: "80%",
                            },
                            {
                                field: "religion",
                                header: "Agama",
                                sortable: true,
                                skeletonWidth: "80%",
                            },
                            {
                                field: "phone",
                                header: "Phone",
                                skeletonWidth: "100%",
                            },
                        ]}
                        data={listData}
                        loading={loadingMemberDataList}
                        meta={meta}
                        onMetaChange={(val) => {
                            console.info(val)
                            setMeta(val)
                        }}
                        onEdit={(row) => handleNavigation("UPDATE", row)}
                        onDelete={(row) => handleNavigation("DELETE", row)}
                        onDetail={(row) => handleNavigation("DETAIL", row)}
                    />
                </CardContent>
            </Card>
            {/* Dialog Component */}
            <SwalDialog
                open={isDialogOpen}
                title="Hapus Data?"
                message="Data yang sudah dihapus tidak bisa dikembalikan."
                variant="warning"
                confirmText="Hapus"
                cancelText="Batal"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => {
                    console.log("deleted");
                    setIsDialogOpen(false);
                }}
            />
        </div>
    )
}