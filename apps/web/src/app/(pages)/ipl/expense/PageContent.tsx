"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { formatCurrency } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { ExpenseInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@monorepo/ui/components/dropdown-menu";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { EllipsisVertical, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const categories = ["security", "kebersihan", "sampah", "listrik", "maintenance", "lainnya"];

export default function PageContent() {
    const [listData, setListData] = useState<ExpenseInterface[]>([]);
    const [selectedItem, setSelectedItem] = useState<ExpenseInterface>();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const { callApi: callList, loading } = useApiService("loadDataExpense");
    const { callApi: callCreate, loading: saving } = useApiService("insertDataExpense");
    const { callApi: callDelete, loading: deleting } = useApiService("deleteDataExpense");
    const formik = useFormik<ExpenseInterface>({
        initialValues: { expense_date: new Date().toISOString().slice(0, 10), category: "security", description: "", amount: 0 },
        onSubmit: () => { handleSubmit(); },
    });

    const load = useCallback(() => {
        callList({ params: {}, metadata: meta }, {
            onSuccess(response) {
                setListData(response.data ?? []);
                setMeta((prev) => ({ ...prev, total: (response as any).metaData?.total ?? 0 }));
            },
        });
    }, [callList, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

    const handleSubmit = useCallback(async () => {
        await callCreate(formik.values, {
            onSuccess(response) {
                toast.success(response.message);
                formik.resetForm();
                load();
            },
        });
    }, [callCreate, formik, load]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Input Pengeluaran</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={formik.handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <Label>Tanggal</Label>
                            <Input className="mt-2" name="expense_date" type="date" value={formik.values.expense_date ?? ""} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Kategori</Label>
                            <select className="mt-2 w-full border rounded-md h-10 px-3" name="category" value={formik.values.category ?? ""} onChange={formik.handleChange}>
                                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <Label>Deskripsi</Label>
                            <Input className="mt-2" name="description" value={formik.values.description ?? ""} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Nominal</Label>
                            <Input className="mt-2" name="amount" type="number" value={formik.values.amount ?? 0} onChange={formik.handleChange} />
                        </div>
                        <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Daftar Pengeluaran</CardTitle></CardHeader>
                <CardContent>
                    <AppDataTable
                        columns={[
                            { field: "expense_date", header: "Tanggal" },
                            { field: "category", header: "Kategori" },
                            { field: "description", header: "Deskripsi" },
                            { field: "amount", header: "Nominal", body: (row) => formatCurrency(row.amount) },
                            {
                                header: "Aksi",
                                body: (row) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <EllipsisVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="text-red-500"
                                                onClick={() => { setSelectedItem(row); setIsDialogOpen(true); }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ),
                            },
                        ]}
                        data={listData}
                        loading={loading}
                        meta={meta}
                        onMetaChange={setMeta}
                    />
                </CardContent>
            </Card>
            <SwalDialog
                open={isDialogOpen}
                isLoading={deleting}
                title="Hapus Pengeluaran?"
                message="Pengeluaran yang dihapus tidak masuk laporan kas."
                variant="warning"
                confirmText="Hapus"
                cancelText="Batal"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => {
                    callDelete({ id: selectedItem?.id }, { onSuccess: () => { toast.success("Pengeluaran dihapus"); load(); } });
                    setIsDialogOpen(false);
                }}
            />
        </div>
    );
}
