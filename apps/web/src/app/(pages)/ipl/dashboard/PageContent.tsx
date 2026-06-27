"use client";

import { formatCurrency, getCurrentPeriod, monthOptions } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { IplDashboardInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useEffect, useState } from "react";

export default function PageContent() {
    const [period, setPeriod] = useState(getCurrentPeriod());
    const [data, setData] = useState<IplDashboardInterface | null>(null);
    const { callApi, loading } = useApiService("getDataIplDashboard");

    const load = () => callApi(period, { onSuccess: (response) => setData(response.data ?? null) });

    useEffect(() => { load(); }, []);

    const cards = [
        ["Total Tagihan", formatCurrency(data?.total_bill)],
        ["Pembayaran Masuk", formatCurrency(data?.total_payment)],
        ["Outstanding", formatCurrency(data?.total_outstanding)],
        ["KK Lunas", data?.paid_count ?? 0],
        ["Belum Bayar", data?.unpaid_count ?? 0],
        ["Sebagian", data?.partial_count ?? 0],
        ["Tunggakan", data?.overdue_count ?? 0],
    ];

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Dashboard IPL</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <div className="flex items-end">
                        <Button onClick={load} disabled={loading}>{loading ? "Memuat..." : "Tampilkan"}</Button>
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {cards.map(([label, value]) => (
                    <Card key={label}>
                        <CardContent className="pt-6">
                            <div className="text-sm text-slate-500">{label}</div>
                            <div className="text-2xl font-semibold mt-2">{value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
