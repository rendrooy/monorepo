"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { formatCurrency } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { IplBillInterface, IplPaymentInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@monorepo/ui/components/dropdown-menu";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { EllipsisVertical, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const [listData, setListData] = useState<IplPaymentInterface[]>([]);
    const [billOptions, setBillOptions] = useState<IplBillInterface[]>([]);
    const [selectedItem, setSelectedItem] = useState<IplPaymentInterface>();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const { callApi: callList, loading } = useApiService("loadDataIplPayment");
    const { callApi: callBills } = useApiService("loadDataIplBill");
    const { callApi: callCreate, loading: saving } = useApiService("insertDataIplPayment");
    const { callApi: callDelete, loading: deleting } = useApiService("deleteDataIplPayment");

    const formik = useFormik<IplPaymentInterface>({
        initialValues: { bill_id: "", payment_date: new Date().toISOString().slice(0, 10), amount: 0, payment_method: "TRANSFER", note: "" },
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

    const loadBills = useCallback(() => {
        callBills({ params: {}, metadata: { page: 1, pageSize: 100, sortBy: "b.created_time", sortDir: "DESC" } }, {
            onSuccess(response) {
                setBillOptions(response.data ?? []);
            },
        });
    }, [callBills]);

    const handleSubmit = useCallback(async () => {
        const bill = billOptions.find((item) => item.id === formik.values.bill_id);
        await callCreate({ ...formik.values, family_id: bill?.family_id }, {
            onSuccess(response) {
                toast.success(response.message);
                formik.resetForm();
                load();
                loadBills();
            },
        });
    }, [billOptions, callCreate, formik, load, loadBills]);

    useEffect(() => { load(); loadBills(); }, [load, loadBills]);

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Input Pembayaran IPL</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={formik.handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2">
                            <Label>Tagihan</Label>
                            <select className="mt-2 w-full border rounded-md h-10 px-3" name="bill_id" value={formik.values.bill_id ?? ""} onChange={formik.handleChange}>
                                <option value="">Pilih tagihan</option>
                                {billOptions.map((bill) => (
                                    <option key={bill.id ?? ""} value={bill.id ?? ""}>
                                        {bill.family_no_kk} - {bill.period_month}/{bill.period_year} - {formatCurrency((bill.amount ?? 0) - (bill.paid_amount ?? 0))}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Tanggal Bayar</Label>
                            <Input className="mt-2" name="payment_date" type="date" value={formik.values.payment_date ?? ""} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Nominal</Label>
                            <Input className="mt-2" name="amount" type="number" value={formik.values.amount ?? 0} onChange={formik.handleChange} />
                        </div>
                        <Button type="submit" disabled={saving || !formik.values.bill_id}>{saving ? "Menyimpan..." : "Simpan"}</Button>
                        <div>
                            <Label>Metode</Label>
                            <Input className="mt-2" name="payment_method" value={formik.values.payment_method ?? ""} onChange={formik.handleChange} />
                        </div>
                        <div className="md:col-span-4">
                            <Label>Catatan</Label>
                            <Input className="mt-2" name="note" value={formik.values.note ?? ""} onChange={formik.handleChange} />
                        </div>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Riwayat Pembayaran</CardTitle></CardHeader>
                <CardContent>
                    <AppDataTable
                        columns={[
                            { field: "family_no_kk", header: "No KK" },
                            { field: "period_month", header: "Periode", body: (row) => `${row.period_month}/${row.period_year}` },
                            { field: "payment_date", header: "Tanggal" },
                            { field: "amount", header: "Nominal", body: (row) => formatCurrency(row.amount) },
                            { field: "payment_method", header: "Metode" },
                            { field: "note", header: "Catatan" },
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
                title="Hapus Pembayaran?"
                message="Status tagihan akan dihitung ulang."
                variant="warning"
                confirmText="Hapus"
                cancelText="Batal"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => {
                    callDelete({ id: selectedItem?.id }, { onSuccess: () => { toast.success("Pembayaran dihapus"); load(); loadBills(); } });
                    setIsDialogOpen(false);
                }}
            />
        </div>
    );
}
