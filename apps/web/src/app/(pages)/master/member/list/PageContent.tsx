"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import type { BaseResponse, MasterMemberInterface, Metadata } from "@monorepo/types";
// import { FilterPanel } from "@/components/FilterPanel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SharedDropdown } from "@/components/SharedDropdown";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useApiService } from "@/hooks/useApiService";
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
import { ChevronDown, EllipsisVertical, Eye, PencilLineIcon, Trash2 } from "lucide-react";

const columns: ColumnDef<MasterMemberInterface>[] = [
    { key: "name", label: "Nama", sortable: true },
    { key: "nik", label: "NIK", sortable: true },
    { key: "sex", label: "Sex" },
    { key: "profession", label: "Profesi" },
];

export default function PageContent() {
    const router = useRouter();
    const [listData, setListData] = useState<MasterMemberInterface[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MasterMemberInterface>();
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const [filterParams, setFilterParams] = useState<Partial<MasterMemberInterface>>({});

    const [fetchKey, setFetchKey] = useState(0);

    const { callApi: callMemberDataList, loading: loadingMemberDataList } = useApiService("loadDataMember");
    const { callApi: callDeleteMember } = useApiService("deleteDataMember");

    const formik = useFormik<Partial<MasterMemberInterface>>({
        initialValues: { name: "", nik: "", sex: "" },
        onSubmit: (values) => {
            setFilterParams(values);
            setMeta((prev) => ({ ...prev, page: 1 }));
            setFetchKey((k) => k + 1);
        },
    });

    const handleGetList = useCallback(
        async (params: Partial<MasterMemberInterface>, pagination: Metadata) => {
            await callMemberDataList(
                { params, metadata: pagination },
                {
                    onSuccess(response) {
                        setListData(response.data ?? []);
                        const total = response.metaData?.total ?? 0;
                        setMeta((prev) => prev.total === total ? prev : { ...prev, total });
                    },
                    onError(error) {
                        console.error("loadDataMember error:", error);
                    },
                }
            );
        },
        [callMemberDataList]
    );

    const handleDelete = useCallback(
        async (id: string) => {
            await callDeleteMember(
                { id },
                {
                    onSuccess(response: BaseResponse) {
                        setIsDialogOpen(false);
                        toast.success(response.message);
                        handleGetList(filterParams, meta);
                    },
                    onError(error) {
                        console.error("deleteDataMember error:", error);
                    },
                }
            );
        },
        [callDeleteMember, filterParams, meta]
    );

    function handleNavigation(type: string, item: MasterMemberInterface | null) {
        setSelectedItem(item ?? undefined);
        if (type === "CREATE") router.push("../master/member/create");
        else if (type === "DELETE") setIsDialogOpen(true);
        else if (type === "UPDATE") router.push(`../master/member/edit/${item?.id}`);
        else if (type === "DETAIL") router.push(`../master/member/view/${item?.id}`);
    }

    useEffect(() => {
        handleGetList(filterParams, meta);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchKey, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Member Management</h1>
                    <p className="text-gray-600">
                        Di halaman ini, Anda dapat mengelola warga master Anda.
                    </p>
                </CardContent>
            </Card>


            <form onSubmit={formik.handleSubmit} className="mt-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6 space-y-4">
                        {/* HEADER COLLAPSE */}
                        <Collapsible>
                            <CollapsibleTrigger className="flex w-full items-center justify-between">
                                <p className="font-medium">Cari Data Warga</p>
                                <ChevronDown className="h-4 w-4" />
                            </CollapsibleTrigger>

                            <CollapsibleContent className="pt-6 space-y-6">

                                {/* GRID 3 HORIZONTAL */}
                                <div className="grid grid-cols-3 md:grid-cols-3 gap-4">

                                    <div>
                                        <Label>Username</Label>
                                        <Input
                                            className="w-full mt-2 border-slate-200 bg-white"
                                            name="name"
                                            value={formik.values.name ?? ""}
                                            onChange={formik.handleChange}
                                            placeholder="Masukkan Nama Warga"
                                        />
                                    </div>

                                    <div>
                                        <Label>Email</Label>
                                        <Input
                                            className="w-full mt-2 border-slate-200 bg-white"
                                            name="nik"
                                            value={formik.values.nik ?? ""}
                                            onChange={formik.handleChange}
                                            placeholder="Masukkan NIK"
                                        />
                                    </div>

                                    <div>
                                        <Label>Role</Label>
                                        <SharedDropdown
                                            id={"sex"}
                                            className="w-full mt-2 border-slate-200 bg-white"
                                            placeholder={"Pilih Jenis Kelamin"}
                                            onValueChange={(value) => {
                                                formik.setFieldValue("sex", value)
                                                formik.setFieldTouched("sex")
                                            }}
                                            value={formik.values.sex ?? ""}
                                            options={[
                                                {
                                                    id: "MALE",
                                                    label: "Male"
                                                },
                                                {
                                                    id: "FEMALE",
                                                    label: "Female"
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* BUTTON */}
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        variant="default"
                                        onClick={() => {
                                            formik.submitForm
                                        }}
                                    >
                                        Cari
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            formik.resetForm()
                                            formik.submitForm
                                        }}
                                    >
                                        Bersihkan
                                    </Button>
                                </div>

                            </CollapsibleContent>
                        </Collapsible>

                    </CardContent>
                </Card>
            </form>

            {/* <FilterPanel
                title="Cari Data Warga"
                onSubmit={formik.submitForm}
                onReset={() => {
                    formik.resetForm();
                    setFilterParams({});
                }}
                columns={3}
            >
                <div>
                    <Label>Nama</Label>
                    <Input
                        className="w-full mt-2"
                        name="name"
                        value={formik.values.name ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan Nama Warga"
                    />
                </div>
                <div>
                    <Label>NIK</Label>
                    <Input
                        className="w-full mt-2"
                        name="nik"
                        value={formik.values.nik ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan NIK"
                    />
                </div>
                <div>
                    <Label>Jenis Kelamin</Label>
                    <SharedDropdown
                        id="sex"
                        className="w-full mt-2"
                        placeholder="Pilih Jenis Kelamin"
                        onValueChange={(value) => formik.setFieldValue("sex", value)}
                        value={formik.values.sex ?? ""}
                        options={[
                            { id: "MALE", label: "Male" },
                            { id: "FEMALE", label: "Female" },
                        ]}
                    />
                </div>
            </FilterPanel> */}

            <DataTable
                columns={columns}
                data={listData}
                isLoading={loadingMemberDataList}
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
                                onClick={() => handleNavigation("DETAIL", item)}
                                className="flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                Detail
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
                        Yakin menghapus data {selectedItem?.name}?
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
