"use client";

import { AppDataTable } from "@/components/DataTable";
import { formatCurrency, getCurrentPeriod, monthOptions, statusLabel } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { IplBillInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useCallback, useEffect, useState } from "react";

export default function PageContent() {
    const [listData, setListData] = useState<IplBillInterface[]>([]);
    const [period, setPeriod] = useState(getCurrentPeriod());
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const { callApi, loading } = useApiService("loadDataIplBill");
    const totalOutstanding = listData.reduce((sum, item) => sum + Number((item.amount ?? 0) - (item.paid_amount ?? 0)), 0);

    const load = useCallback(() => {
        callApi({ params: { ...period, status: "OVERDUE" }, metadata: meta }, {
            onSuccess(response) {
                setListData(response.data ?? []);
                setMeta((prev) => ({ ...prev, total: (response as any).metaData?.total ?? 0 }));
            },
        });
    }, [callApi, meta.page, meta.pageSize, meta.sortBy, meta.sortDir, period]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Tunggakan IPL</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <Label>Bulan</Label>
                        <select className="mt-2 w-full border rounded-md h-10 px-3" value={period.period_month} onChange={(e) => setPeriod({ ...period, period_month: Number(e.target.value) })}>
                            {monthOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label>Tahun</Label>
                        <Input className="mt-2" type="number" value={period.period_year} onChange={(e) => setPeriod({ ...period, period_year: Number(e.target.value) })} />
                    </div>
                    <Button onClick={load}>Tampilkan</Button>
                    <div>
                        <div className="text-sm text-slate-500">Total Outstanding</div>
                        <div className="text-xl font-semibold">{formatCurrency(totalOutstanding)}</div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <AppDataTable
                        columns={[
                            { field: "family_no_kk", header: "No KK" },
                            { field: "family_address", header: "Alamat" },
                            { field: "period_month", header: "Periode", body: (row) => `${row.period_month}/${row.period_year}` },
                            { field: "amount", header: "Tagihan", body: (row) => formatCurrency(row.amount) },
                            { field: "paid_amount", header: "Terbayar", body: (row) => formatCurrency(row.paid_amount) },
                            { field: "status", header: "Status", body: (row) => statusLabel[row.status ?? ""] ?? row.status },
                        ]}
                        data={listData}
                        loading={loading}
                        meta={meta}
                        onMetaChange={setMeta}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
