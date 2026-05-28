"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import type { BaseResponse, MasterUserInterface, Metadata } from "@monorepo/types";
import { FilterPanel } from "@/components/FilterPanel";
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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical, PencilLineIcon, Trash2 } from "lucide-react";

const columns: ColumnDef<MasterUserInterface>[] = [
    { key: "username", label: "Username", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "role_name", label: "Role", sortable: true },
    { key: "member_name", label: "Member" },
];

export default function PageContent() {
    const router = useRouter();
    const [listData, setListData] = useState<MasterUserInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MasterUserInterface>();
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const [filterParams, setFilterParams] = useState<Partial<MasterUserInterface>>({});

    const [fetchKey, setFetchKey] = useState(0);

    const { callApi: callUserDataList, loading: loadingUserDataList } = useApiService("loadDataUser");
    const { callApi: callDeleteUser } = useApiService("deleteDataUser");

    const formik = useFormik<Partial<MasterUserInterface>>({
        initialValues: { username: "", email: "" },
        onSubmit: (values) => {
            setFilterParams(values);
            setMeta((prev) => ({ ...prev, page: 1 }));
            setFetchKey((k) => k + 1);
        },
    });

    const handleGetList = useCallback(
        async (params: Partial<MasterUserInterface>, pagination: Metadata) => {
            await callUserDataList(
                { params: params as MasterUserInterface, metadata: pagination },
                {
                    onSuccess(response) {
                        setListData(response.data ?? []);
                        const total = response.metaData?.total ?? 0;
                        setMeta((prev) => prev.total === total ? prev : { ...prev, total });
                    },
                    onError(error) {
                        console.error("loadDataUser error:", error);
                    },
                }
            );
        },
        [callUserDataList]
    );

    const handleDelete = useCallback(
        async (id: string) => {
            await callDeleteUser(
                { id } as unknown as MasterUserInterface,
                {
                    onSuccess(response: BaseResponse) {
                        setIsDialogOpen(false);
                        toast.success(response.message);
                        handleGetList(filterParams, meta);
                    },
                    onError(error) {
                        console.error("deleteDataUser error:", error);
                    },
                }
            );
        },
        [callDeleteUser, filterParams, meta]
    );

    function handleNavigation(type: string, item: MasterUserInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/user/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/user/edit/${item?.id}`);
    }

    useEffect(() => {
        handleGetList(filterParams, meta);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchKey, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">User Management</h1>
                    <p className="text-gray-600">
                        Di halaman ini, Anda dapat mengelola data pengguna sistem.
                    </p>
                </CardContent>
            </Card>

            <FilterPanel
                title="Cari Data User"
                columns={2}
                onSubmit={formik.submitForm}
                onReset={() => {
                    formik.resetForm();
                    setFilterParams({});
                }}
            >
                <div>
                    <Label>Username</Label>
                    <Input
                        className="w-full mt-2"
                        name="username"
                        value={formik.values.username ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan username"
                    />
                </div>
                <div>
                    <Label>Email</Label>
                    <Input
                        className="w-full mt-2"
                        name="email"
                        value={formik.values.email ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan email"
                    />
                </div>
            </FilterPanel>

            <DataTable
                columns={columns}
                data={listData}
                isLoading={loadingUserDataList}
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
                        Yakin menghapus user {selectedItem?.username}?
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
