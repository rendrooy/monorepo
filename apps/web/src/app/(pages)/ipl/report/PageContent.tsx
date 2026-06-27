"use client";

import { formatCurrency, getCurrentPeriod, monthOptions } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { CashReportInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

export default function PageContent() {
    const [period, setPeriod] = useState(getCurrentPeriod());
    const [data, setData] = useState<CashReportInterface | null>(null);
    const { callApi, loading } = useApiService("getDataCashReport");
    const load = () => callApi(period, { onSuccess: (response) => setData(response.data ?? null) });
    useEffect(() => { load(); }, []);

    const exportCsv = () => {
        const rows = [
            ["Periode", `${period.period_month}/${period.period_year}`],
            ["Saldo Awal", data?.opening_balance ?? 0],
            ["Pemasukan IPL", data?.total_income ?? 0],
            ["Pengeluaran", data?.total_expense ?? 0],
            ["Saldo Akhir", data?.ending_balance ?? 0],
        ];
        const csv = rows.map((row) => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `laporan-kas-${period.period_month}-${period.period_year}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const rows = [
        ["Saldo Awal", data?.opening_balance],
        ["Pemasukan IPL", data?.total_income],
        ["Pengeluaran", data?.total_expense],
        ["Saldo Akhir", data?.ending_balance],
    ];

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Laporan Kas IPL</CardTitle></CardHeader>
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
                    <Button onClick={load} disabled={loading}>{loading ? "Memuat..." : "Tampilkan"}</Button>
                    <Button variant="outline" onClick={exportCsv} disabled={!data}><Download />Export CSV</Button>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {rows.map(([label, value]) => (
                    <Card key={label as string}>
                        <CardContent className="pt-6">
                            <div className="text-sm text-slate-500">{label}</div>
                            <div className="text-2xl font-semibold mt-2">{formatCurrency(value as number)}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
