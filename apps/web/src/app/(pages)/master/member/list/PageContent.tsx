"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type {
    MasterMemberInterface,
    Metadata,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@monorepo/ui/components/dropdown-menu";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import {
    EllipsisVertical,
    LucideEye,
    PencilLineIcon,
    Plus,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const router = useRouter();
    const memberMenuPath = "master/member";
    const authMenu = useMemo(() => getAuthMenu(), []);
    const canCreate = useMemo(
        () => canAccessRoute(authMenu, memberMenuPath, "ADD"),
        [authMenu],
    );
    const canEdit = useMemo(
        () => canAccessRoute(authMenu, memberMenuPath, "EDIT"),
        [authMenu],
    );
    const canDelete = useMemo(
        () => canAccessRoute(authMenu, memberMenuPath, "DELETE"),
        [authMenu],
    );
    const [selectedItem, setSelectedItem] = useState<MasterMemberInterface>();
    const [listData, setListData] = useState<MasterMemberInterface[]>([]);
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { callApi: callMemberDataList, loading: loadingMemberDataList } =
        useApiService("loadDataMember");
    const { callApi: callDeleteMember } =
        useApiService("deleteDataMember");
    const [filterParams, setFilterParams] = useState<
        Partial<MasterMemberInterface>
    >({});

    /** 🔥 Fetch Data */
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
                },
            );
        },
        [],
    );

    const handleDelete = useCallback(
        async (data: MasterMemberInterface) => {
            if (!canDelete) {
                toast.error("Anda tidak memiliki akses untuk menghapus data ini.");
                return;
            }

            await callDeleteMember(
                {
                    id: data.id ?? "",
                },
                {
                    onSuccess(data) {
                        toast.success(MESSAGES.SUCCESS.DELETE);
                        handleGetList(filterParams, meta);
                    },
                    onError(data) {
                        toast.error(MESSAGES.ERROR.DELETE);
                    },
                },
            );
        },
        [callDeleteMember, canDelete, filterParams, handleGetList, meta],
    );

    const filterForm = useFormik<MasterMemberInterface>({
        initialValues: {
            name: "",
            nik: "",
            religion: "",
        },
        onSubmit: () => { },
    });

    function handleNavigation(type: string, item: MasterMemberInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/member/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE")
            router.push(`../master/member/edit/${item?.id}`);
        else if (type === "DETAIL")
            router.push(`../master/member/view/${item?.id}`);
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
                onSubmit={() => {
                    if (filterForm.values.nik && !/^\d{16}$/.test(filterForm.values.nik)) {
                        toast.error("Filter NIK harus tepat 16 digit");
                        return;
                    }
                    setFilterParams(filterForm.values);
                }}
                onReset={() => {
                    filterForm.resetForm();
                    setFilterParams({});
                }}
            >
                <div>
                    <Label>Nama</Label>
                    <Input
                        id="name"
                        className="mt-2"
                        value={filterForm.values.name ?? ""}
                        placeholder="Masukan Filter Nama"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>NIK</Label>
                    <Input
                        id="nik"
                        className="mt-2"
                        value={filterForm.values.nik ?? ""}
                        placeholder="Masukkan 16 digit NIK"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>Agama</Label>
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
                            {
                                header: "Aksi",
                                body: (row: MasterMemberInterface) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <EllipsisVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleNavigation("DETAIL", row)}>
                                                <LucideEye className="w-4 h-4 mr-2" />
                                                View
                                            </DropdownMenuItem>

                                            {canEdit ? (
                                                <DropdownMenuItem onClick={() => handleNavigation("UPDATE", row)}>
                                                    <PencilLineIcon className="w-4 h-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                            ) : null}

                                            {canDelete ? (
                                                <DropdownMenuItem
                                                    onClick={() => handleNavigation("DELETE", row)}
                                                    className="text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ),
                            },
                        ]}
                        data={listData}
                        loading={loadingMemberDataList}
                        meta={meta}
                        onMetaChange={(val) => {
                            console.info(val);
                            setMeta(val);
                        }}
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
                    handleDelete(selectedItem!);
                    setIsDialogOpen(false);
                }}
            />
        </div>
    );
}
