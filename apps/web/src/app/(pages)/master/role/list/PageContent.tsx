"use client";

import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Button } from "@monorepo/ui/components/button";
import { useFormik } from "formik";
import type { BaseResponse, MasterRoleInterface, Metadata } from "@monorepo/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useApiService } from "@/hooks";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@monorepo/ui/components/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@monorepo/ui/components/dropdown-menu";
import { EllipsisVertical, PencilLineIcon, Trash2 } from "lucide-react";
import { FilterPanel } from "@/components/FilterPanel";

const columns: ColumnDef<MasterRoleInterface>[] = [
    { key: "name", label: "Nama Role", sortable: true },
    { key: "code", label: "Kode", sortable: true },
];

export default function PageContent() {
    const router = useRouter();
    const [listData, setListData] = useState<MasterRoleInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MasterRoleInterface>();
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const [filterParams, setFilterParams] = useState<Partial<MasterRoleInterface>>({});

    const [fetchKey, setFetchKey] = useState(0);

    const { callApi: callRoleDataList, loading: loadingRoleDataList } = useApiService("loadDataRole");
    const { callApi: callDeleteRole } = useApiService("deleteDataRole");

    const formik = useFormik<Partial<MasterRoleInterface>>({
        initialValues: { name: "", code: "" },
        onSubmit: (values) => {
            setFilterParams(values);
            setMeta((prev) => ({ ...prev, page: 1 }));
            setFetchKey((k) => k + 1);
        },
    });

    const handleGetList = useCallback(
        async (params: Partial<MasterRoleInterface>, pagination: Metadata) => {
            await callRoleDataList(
                { params, metadata: pagination },
                {
                    onSuccess(response) {
                        setListData(response.data ?? []);
                        const total = response.metaData?.total ?? 0;
                        setMeta((prev) => prev.total === total ? prev : { ...prev, total });
                    },
                    onError(error) {
                        console.error("loadDataRole error:", error);
                    },
                }
            );
        },
        [callRoleDataList]
    );

    const handleDelete = useCallback(
        async (id: string) => {
            await callDeleteRole(
                { id },
                {
                    onSuccess(response: BaseResponse) {
                        setIsDialogOpen(false);
                        toast.success(response.message);
                        handleGetList(filterParams, meta);
                    },
                    onError(error) {
                        console.error("deleteDataRole error:", error);
                    },
                }
            );
        },
        [callDeleteRole, filterParams, meta]
    );

    function handleNavigation(type: string, item: MasterRoleInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/role/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/role/edit/${item?.id}`);
    }

    useEffect(() => {
        handleGetList(filterParams, meta);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchKey, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

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
                title="Cari Data Role"
                columns={2}
                onSubmit={formik.submitForm}
                onReset={() => {
                    formik.resetForm();
                    setFilterParams({});
                }}
            >
                <div>
                    <Label>Nama Role</Label>
                    <Input
                        className="w-full mt-2"
                        name="name"
                        value={formik.values.name ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan nama role"
                    />
                </div>
                <div>
                    <Label>Kode</Label>
                    <Input
                        className="w-full mt-2"
                        name="code"
                        value={formik.values.code ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan kode role"
                    />
                </div>
            </FilterPanel>

            <DataTable
                columns={columns}
                data={listData}
                isLoading={loadingRoleDataList}
                meta={meta}
                onMetaChange={(changes) => setMeta((prev) => ({ ...prev, ...changes }))}
                onAdd={() => handleNavigation("CREATE", null)}
                actionColumn={(item) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <EllipsisVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => handleNavigation("UPDATE", item)}
                                className="flex items-center gap-2"
                            >
                                <PencilLineIcon className="w-4 h-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleNavigation("DELETE", item)}
                                className="flex items-center gap-2 text-red-500"
                            >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                Hapus
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        Yakin menghapus role {selectedItem?.name}?
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleDelete(selectedItem?.id ?? "")}
                        >
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
