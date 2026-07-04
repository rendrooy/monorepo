"use client"

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { SharedDropdown, type SharedDropdownOption } from "@/components/SharedDropdown";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type { BaseResponse, BaseResponseDropdown, MasterUserInterface, Metadata } from "@monorepo/types";
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
    const masterUserPath = "master/user";
    const authMenu = useMemo(() => getAuthMenu(), []);
    const canCreate = useMemo(() => canAccessRoute(authMenu, masterUserPath, "ADD"), [authMenu]);
    const canEdit = useMemo(() => canAccessRoute(authMenu, masterUserPath, "EDIT"), [authMenu]);
    const canDelete = useMemo(() => canAccessRoute(authMenu, masterUserPath, "DELETE"), [authMenu]);
    const [selectedItem, setSelectedItem] = useState<MasterUserInterface>();
    const [listData, setListData] = useState<MasterUserInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });
    const [filterParams, setFilterParams] =
        useState<Partial<MasterUserInterface>>({});
    const [roleOptions, setRoleOptions] = useState<SharedDropdownOption[]>([]);

    const { callApi: callUserDataList, loading: loadingUserDataList } =
        useApiService("loadDataUser");
    const { callApi: callDeleteUser, loading: loadingDeleteUser } =
        useApiService("deleteDataUser");
    const { callApi: callDropdownRole, loading: loadingRole } =
        useApiService("dropdownRole");

    /** 🔥 Fetch Data */
    const handleGetList = useCallback(
        async (params: Partial<MasterUserInterface>, pagination: Metadata) => {
            await callUserDataList(
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
                        console.error("loadDataUser error:", error);
                    },
                }
            );
        },
        [callUserDataList]
    );

    const handleDelete = useCallback(async (data: MasterUserInterface) => {
        if (!canDelete) {
            toast.error("Anda tidak memiliki akses untuk menghapus data ini.");
            return;
        }

        await callDeleteUser(
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
    }, [callDeleteUser, canDelete, filterParams, handleGetList, meta]);

    const loadRoleOptions = useCallback(async () => {
        await callDropdownRole(
            {},
            {
                onSuccess(response: BaseResponse<BaseResponseDropdown[]>) {
                    setRoleOptions(
                        (response.data ?? []).map((item) => ({
                            id: item.value,
                            label: item.label,
                        })),
                    );
                },
            },
        );
    }, [callDropdownRole]);

    function handleNavigation(type: string, item: MasterUserInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/user/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/user/edit/${item?.id}`);
        else if (type === "DETAIL") router.push(`../master/user/view/${item?.id}`);
    }
    const filterForm = useFormik<MasterUserInterface>({
        initialValues: {
            username: "",
            email: "",
            role_id: ""
        },
        onSubmit: () => { }
    });

    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize, meta.sortBy, meta.sortDir, filterParams, handleGetList]);

    useEffect(() => {
        loadRoleOptions();
    }, [loadRoleOptions]);

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">User Management</h1>
                    <p className="text-gray-600">
                        Di halaman ini, Anda dapat mengelola data user pengguna.
                    </p>
                </CardContent>
            </Card>
            <FilterPanel
                columns={3}
                onSubmit={() => setFilterParams(filterForm.values)}
                onReset={() => {
                    filterForm.resetForm();
                    setFilterParams({});
                }} >

                <div>
                    <Label>
                        Username
                    </Label>
                    <Input
                        id="username"
                        className="mt-2"
                        value={filterForm.values.username ?? ""}
                        placeholder="Masukan Filter Username"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>
                        Email
                    </Label>
                    <Input
                        id="email"
                        className="mt-2"
                        value={filterForm.values.email ?? ""}
                        placeholder="Masukan Filter Email"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <SharedDropdown
                        id={"role_id"}
                        label="Role"
                        value={filterForm.values.role_id ?? ""}
                        loading={loadingRole}
                        onValueChange={(value: string) => {
                            filterForm.setFieldValue("role_id", value);
                        }}
                        options={roleOptions}
                        clearable
                        placeholder="Masukan Filter Role"
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
                                field: "username",
                                header: "Username",
                                skeletonWidth: "60%",
                            },
                            {
                                field: "email",
                                header: "Email",
                                skeletonWidth: "80%",
                            },
                            {
                                field: "member_name",
                                header: "Nama",
                                skeletonWidth: "100%",
                            },
                            {
                                field: "role_name",
                                header: "Role",
                                skeletonWidth: "100%",
                                sortable: true,
                            },
                        ]}
                        data={listData}
                        loading={loadingUserDataList}
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
                isLoading={loadingDeleteUser}
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
    );
}
