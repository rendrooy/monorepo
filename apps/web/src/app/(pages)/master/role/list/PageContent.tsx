"use client"

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { StatusBadge } from "@/components/StatusBadges";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type { MasterRoleInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const router = useRouter();
    const masterRolePath = "master/role";
    const authMenu = useMemo(() => getAuthMenu(), []);
    const canCreate = useMemo(() => canAccessRoute(authMenu, masterRolePath, "ADD"), [authMenu]);
    const canEdit = useMemo(() => canAccessRoute(authMenu, masterRolePath, "EDIT"), [authMenu]);
    const canDelete = useMemo(() => canAccessRoute(authMenu, masterRolePath, "DELETE"), [authMenu]);
    const [selectedItem, setSelectedItem] = useState<MasterRoleInterface>();
    const [listData, setListData] = useState<MasterRoleInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });
    const { callApi: callRoleDataList, loading: loadingRoleDataList } =
        useApiService("loadDataRole");
    const { callApi: callDeleteRole, loading: loadingDeleteRole } =
        useApiService("deleteDataRole")
    const [filterParams, setFilterParams] =
        useState<Partial<MasterRoleInterface>>({});
    /** 🔥 Fetch Data */
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
    const handleDelete = useCallback(async (data: MasterRoleInterface) => {
        if (!canDelete) {
            toast.error("Anda tidak memiliki akses untuk menghapus data ini.");
            return;
        }

        await callDeleteRole(
            {
                id: data.id ?? ""
            },
            {
                onSuccess(data) {
                    toast.success(MESSAGES.SUCCESS.DELETE);
                    handleGetList(filterParams, meta);
                },
                onError(data) {
                    toast.error(MESSAGES.ERROR.DELETE);
                }
            }
        )
    }, [callDeleteRole, canDelete, filterParams, handleGetList, meta]);

    function handleNavigation(type: string, item: MasterRoleInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/role/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/role/edit/${item?.id}`);
        else if (type === "DETAIL") router.push(`../master/role/view/${item?.id}`);
    }
    const filterForm = useFormik<MasterRoleInterface>({
        initialValues: {
            name: "",
            code: "",

        },
        onSubmit: () => { }
    });

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
                columns={2}
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
                        Kode
                    </Label>
                    <Input
                        id="code"
                        className="mt-2"
                        value={filterForm.values.code ?? ""}
                        placeholder="Masukan Filter Kode"
                        onChange={filterForm.handleChange}
                    />
                </div>
            </FilterPanel>
            <Card className="mt-6">
                <CardContent className="pt-6">
                    {canCreate ? (
                        <div className="flex justify-start-end mb-6">
                            <Button
                                onClick={() => {
                                    handleNavigation("CREATE", null);
                                }}
                                variant={"outline"}
                            >
                                <Plus />
                                Tambah Data
                            </Button>
                        </div>
                    ) : null}
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
                            {
                                field: "is_active",
                                header: "Active",
                                body(row) {
                                    return <StatusBadge
                                        active={row.is_active ?? false} />
                                }
                            },
                        ]}
                        data={listData}
                        loading={loadingRoleDataList}
                        meta={meta}
                        onMetaChange={setMeta}
                        onEdit={canEdit ? (row) => handleNavigation("UPDATE", row) : undefined}
                        onDetail={(row) => handleNavigation("DETAIL", row)}
                        onDelete={canDelete ? (row) => handleNavigation("DELETE", row) : undefined}
                    />
                </CardContent>
            </Card>

            {/* Dialog Component */}
            <SwalDialog
                open={isDialogOpen}
                isLoading={loadingDeleteRole}
                title="Hapus Data?"
                message={`Data yang sudah dihapus tidak bisa dikembalikan.`}
                variant="warning"
                confirmText="Hapus"
                cancelText="Batal"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => {
                    handleDelete(selectedItem!)
                    setIsDialogOpen(false);
                }}
            />
        </div>
    )
}
