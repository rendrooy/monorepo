"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import type { MasterMenuInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const router = useRouter();
    const [selectedItem, setSelectedItem] = useState<MasterMenuInterface>();
    const [listData, setListData] = useState<MasterMenuInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filterParams, setFilterParams] = useState<Partial<MasterMenuInterface>>({});
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const { callApi: callList, loading } = useApiService("loadDataMenu");
    const { callApi: callDelete, loading: loadingDelete } = useApiService("deleteDataMenu");

    const filterForm = useFormik<MasterMenuInterface>({
        initialValues: { name: "", code: "", path_url: "" },
        onSubmit: () => { },
    });

    const handleGetList = useCallback(async (params: Partial<MasterMenuInterface>, pagination: Metadata) => {
        await callList({ params, metadata: pagination }, {
            onSuccess(response) {
                setListData(response.data ?? []);
                setMeta((prev) => ({ ...prev, total: (response as any).metaData?.total ?? 0 }));
            },
            onError(error) {
                console.error("loadDataMenu error:", error);
            },
        });
    }, [callList]);

    const handleDelete = useCallback(async (data: MasterMenuInterface) => {
        await callDelete({ id: data.id ?? "" }, {
            onSuccess() {
                toast.success(MESSAGES.SUCCESS.DELETE);
                handleGetList(filterParams, meta);
            },
            onError() {
                toast.error(MESSAGES.ERROR.DELETE);
            },
        });
    }, [callDelete, filterParams, handleGetList, meta]);

    function handleNavigation(type: string, item: MasterMenuInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/menu/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/menu/edit/${item?.id}`);
        else if (type === "DETAIL") router.push(`../master/menu/view/${item?.id}`);
    }

    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize, meta.sortBy, meta.sortDir, filterParams, handleGetList]);

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Menu Management</h1>
                    <p className="text-gray-600">Kelola data menu aplikasi.</p>
                </CardContent>
            </Card>

            <FilterPanel
                columns={3}
                onSubmit={() => setFilterParams(filterForm.values)}
                onReset={() => {
                    filterForm.resetForm();
                    setFilterParams({});
                }}
            >
                <div>
                    <Label>Nama</Label>
                    <Input id="name" className="mt-2" value={filterForm.values.name ?? ""} onChange={filterForm.handleChange} />
                </div>
                <div>
                    <Label>Kode</Label>
                    <Input id="code" className="mt-2" value={filterForm.values.code ?? ""} onChange={filterForm.handleChange} />
                </div>
                <div>
                    <Label>Path URL</Label>
                    <Input id="path_url" className="mt-2" value={filterForm.values.path_url ?? ""} onChange={filterForm.handleChange} />
                </div>
            </FilterPanel>

            <Card className="mt-6">
                <CardContent className="pt-6">
                    <Button onClick={() => handleNavigation("CREATE", null)} variant="outline">
                        <Plus />
                        Tambah Data
                    </Button>
                    <AppDataTable
                        columns={[
                            { field: "code", header: "Kode", sortable: true },
                            { field: "name", header: "Nama", sortable: true },
                            { field: "menu_level", header: "Level", sortable: true },
                            { field: "path_url", header: "Path URL" },
                            { field: "icon", header: "Icon" },
                            { field: "sort_order", header: "Urutan", sortable: true },
                            { field: "is_active", header: "Aktif", body: (row) => row.is_active ? "Ya" : "Tidak" },
                        ]}
                        data={listData}
                        loading={loading}
                        meta={meta}
                        onMetaChange={setMeta}
                        onEdit={(row) => handleNavigation("UPDATE", row)}
                        onDetail={(row) => handleNavigation("DETAIL", row)}
                        onDelete={(row) => handleNavigation("DELETE", row)}
                    />
                </CardContent>
            </Card>

            <SwalDialog
                open={isDialogOpen}
                isLoading={loadingDelete}
                title="Hapus Data?"
                message="Data yang sudah dihapus tidak bisa dikembalikan."
                variant="warning"
                confirmText="Hapus"
                cancelText="Batal"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => {
                    handleDelete(selectedItem!);
                    setIsDialogOpen(false);
                }}
            />
        </div>
    );
}
