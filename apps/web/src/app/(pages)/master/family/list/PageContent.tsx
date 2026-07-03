"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import type { MasterFamilyInterface, Metadata } from "@monorepo/types";
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
    const [selectedItem, setSelectedItem] = useState<MasterFamilyInterface>();
    const [listData, setListData] = useState<MasterFamilyInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filterParams, setFilterParams] = useState<Partial<MasterFamilyInterface>>({});
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const { callApi: callList, loading } = useApiService("loadDataFamily");
    const { callApi: callDelete, loading: loadingDelete } = useApiService("deleteDataFamily");

    const filterForm = useFormik<MasterFamilyInterface>({
        initialValues: { no_kk: "", no_pbb: "", address: "" },
        onSubmit: () => { },
    });

    const handleGetList = useCallback(async (params: Partial<MasterFamilyInterface>, pagination: Metadata) => {
        await callList({ params, metadata: pagination }, {
            onSuccess(response) {
                setListData(response.data ?? []);
                setMeta((prev) => ({ ...prev, total: (response as any).metaData?.total ?? 0 }));
            },
        });
    }, [callList]);

    const handleDelete = useCallback(async (data: MasterFamilyInterface) => {
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

    function handleNavigation(type: string, item: MasterFamilyInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/family/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/family/edit/${item?.id}`);
        else if (type === "DETAIL") router.push(`../master/family/view/${item?.id}`);
    }

    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize, meta.sortBy, meta.sortDir, filterParams, handleGetList]);

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Family Management</h1>
                    <p className="text-gray-600">Kelola data KK dan alamat keluarga warga.</p>
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
                    <Label>No KK</Label>
                    <Input id="no_kk" className="mt-2" value={filterForm.values.no_kk ?? ""} onChange={filterForm.handleChange} />
                </div>
                <div>
                    <Label>No PBB</Label>
                    <Input id="no_pbb" className="mt-2" value={filterForm.values.no_pbb ?? ""} onChange={filterForm.handleChange} />
                </div>
                <div>
                    <Label>Alamat</Label>
                    <Input id="address" className="mt-2" value={filterForm.values.address ?? ""} onChange={filterForm.handleChange} />
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
                            { field: "no_kk", header: "No KK", sortable: true },
                            { field: "no_pbb", header: "No PBB", sortable: true },
                            { field: "address", header: "Alamat" },
                            { field: "postal_code", header: "Kode Pos" },
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
