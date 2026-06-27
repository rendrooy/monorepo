"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { formatCurrency, getCurrentPeriod, monthOptions, statusLabel } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { IplBillInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const [listData, setListData] = useState<IplBillInterface[]>([]);
    const [selectedItem, setSelectedItem] = useState<IplBillInterface>();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const [filterParams, setFilterParams] = useState<Partial<IplBillInterface>>(getCurrentPeriod());
    const { callApi: callList, loading } = useApiService("loadDataIplBill");
    const { callApi: callGenerate, loading: generating } = useApiService("generateDataIplBill");
    const { callApi: callDelete, loading: deleting } = useApiService("deleteDataIplBill");

    const formik = useFormik({ initialValues: { ...getCurrentPeriod(), amount: 0, due_day: 10 }, onSubmit: () => { handleGenerate(); } });

    const load = useCallback(() => {
        callList({ params: filterParams, metadata: meta }, {
            onSuccess(response) {
                setListData(response.data ?? []);
                setMeta((prev) => ({ ...prev, total: (response as any).metaData?.total ?? 0 }));
            },
        });
    }, [callList, filterParams, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

    const handleGenerate = useCallback(async () => {
        await callGenerate(formik.values, {
            onSuccess(response) {
                const result = response.data;
                toast.success(`Generate selesai. Baru: ${result?.generated ?? 0}, skip: ${result?.skipped ?? 0}`);
                setFilterParams({ period_month: formik.values.period_month, period_year: formik.values.period_year });
                load();
            },
        });
    }, [callGenerate, formik.values, load]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Generate Tagihan IPL</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={formik.handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <Label>Bulan</Label>
                            <select className="mt-2 w-full border rounded-md h-10 px-3" name="period_month" value={formik.values.period_month} onChange={formik.handleChange}>
                                {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label>Tahun</Label>
                            <Input className="mt-2" name="period_year" type="number" value={formik.values.period_year} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Nominal</Label>
                            <Input className="mt-2" name="amount" type="number" value={formik.values.amount} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Jatuh Tempo</Label>
                            <Input className="mt-2" name="due_day" type="number" value={formik.values.due_day} onChange={formik.handleChange} />
                        </div>
                        <Button type="submit" disabled={generating}><Plus />{generating ? "Generate..." : "Generate"}</Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Daftar Tagihan</CardTitle></CardHeader>
                <CardContent>
                    <AppDataTable
                        columns={[
                            { field: "family_no_kk", header: "No KK" },
                            { field: "family_address", header: "Alamat" },
                            { field: "period_month", header: "Bulan", body: (row) => `${row.period_month}/${row.period_year}` },
                            { field: "amount", header: "Tagihan", body: (row) => formatCurrency(row.amount) },
                            { field: "paid_amount", header: "Terbayar", body: (row) => formatCurrency(row.paid_amount) },
                            { field: "status", header: "Status", body: (row) => statusLabel[row.status ?? ""] ?? row.status },
                        ]}
                        data={listData}
                        loading={loading}
                        meta={meta}
                        onMetaChange={setMeta}
                        onDelete={(row) => { setSelectedItem(row); setIsDialogOpen(true); }}
                    />
                </CardContent>
            </Card>
            <SwalDialog
                open={isDialogOpen}
                isLoading={deleting}
                title="Hapus Tagihan?"
                message="Tagihan yang sudah dihapus tidak tampil di laporan."
                variant="warning"
                confirmText="Hapus"
                cancelText="Batal"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => {
                    callDelete({ id: selectedItem?.id }, { onSuccess: () => { toast.success("Tagihan dihapus"); load(); } });
                    setIsDialogOpen(false);
                }}
            />
        </div>
    );
}
