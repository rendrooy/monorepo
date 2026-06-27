"use client"

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { SharedDropdown } from "@/components/SharedDropdown";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import type { MasterUserInterface, Metadata } from "@monorepo/types";
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

    const { callApi: callRoleDataList, loading: loadingUserDataList } =
        useApiService("loadDataUser");
    const { callApi: callDeleteRole, loading: loadingDeleteUser } =
        useApiService("deleteDataUser")

    /** 🔥 Fetch Data */
    const handleGetList = useCallback(
        async (params: Partial<MasterUserInterface>, pagination: Metadata) => {
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
        []
    );

    const handleDelete = useCallback(async (data: MasterUserInterface) => {
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
    }, []);

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
    }, [meta.page, meta.pageSize, meta.sortBy, meta.sortDir, filterParams]);




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
                onSubmit={function (): void {
                    throw new Error("Function not implemented.");
                }}
                onReset={function (): void {
                    throw new Error("Function not implemented.");
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
                        onValueChange={function (value: string): void {
                            throw new Error("Function not implemented.");
                        }}
                        placeholder="Masukan Filter Role"
                    >
                    </SharedDropdown>
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
                        onEdit={(row) => handleNavigation("UPDATE", row)}
                        onDetail={(row) => handleNavigation("DETAIL", row)}
                        onDelete={(row) => handleNavigation("DELETE", row)}
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