"use client";

import { AppDataTable } from "@/components/DataTable";
import { IplStatusBadge } from "@/components/IplStatusBadge";
import { UmkmAdsCarousel } from "@/components/UmkmAdsCarousel";
import { useApiService } from "@/hooks";
import { getAuthMenu, getAuthUser } from "@/utils/auth-storage";
import { formatDate } from "@/utils/format-date";
import { canAccessRoute } from "@/utils/permission";
import type { AuthUserInterface, IplDashboardInterface, IplFinancialTrendInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { FinancialTrendChart } from "@monorepo/ui/components/financial-trend-chart";
import MonthYearPicker, { type YearMonth } from "@monorepo/ui/components/monthyear";
import { Popover, PopoverContent, PopoverTrigger } from "@monorepo/ui/components/popover";
import { ArrowRight, Banknote, CalendarDays, ChevronDown, CircleDollarSign, Clock3, FileCheck2, ReceiptText, Scale, WalletCards } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const monthCodes = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const toPeriod = ({ month, year }: YearMonth) => `${monthCodes[month - 1] || "JAN"}-${year}`;
const fromPeriod = (period: string): YearMonth => { const [month, year] = period.split("-"); const index = monthCodes.indexOf(month || ""); return { month: index >= 0 ? index + 1 : new Date().getMonth() + 1, year: Number(year) || new Date().getFullYear() }; };
const currentPeriod = () => toPeriod({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
const money = (value?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
const emptyDashboard: IplDashboardInterface = { audience: "RESIDENT", period: "", summary: { total_billed: 0, cash_received: 0, recognized_income: 0, outstanding_amount: 0, pending_payment_amount: 0, family_credit_balance: 0, total_bill_count: 0, paid_bill_count: 0 }, pending_payment_count: 0, recent_bills: [], recent_payments: [], income_summary: { total_income: 0, ipl_income: 0, umkm_ads_income: 0 }, recent_transactions: [] };

function Metric({ label, value, detail, icon: Icon }: Readonly<{ label: string; value: string; detail?: string; icon: typeof Banknote }>) {
  return <div className="flex min-h-28 items-start gap-4 rounded-md border border-slate-200 bg-white p-4"><div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-slate-100"><Icon className="h-5 w-5 text-slate-600" /></div><div className="min-w-0"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>{detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}</div></div>;
}

export default function PageContent() {
  const [user, setUser] = useState<AuthUserInterface | null>(null);
  const [period, setPeriod] = useState(currentPeriod());
  const [dashboard, setDashboard] = useState<IplDashboardInterface>(emptyDashboard);
  const [trend, setTrend] = useState<IplFinancialTrendInterface[]>([]);
  const [showTotalBilled, setShowTotalBilled] = useState(true);
  const [showIplIncome, setShowIplIncome] = useState(true);
  const [showUmkmAdsIncome, setShowUmkmAdsIncome] = useState(true);
  const [ready, setReady] = useState(false);
  const { callApi, loading } = useApiService("getIplDashboard");
  const { callApi: loadTrend, loading: loadingTrend } = useApiService("getIplFinancialTrend");
  const authMenu = useMemo(() => getAuthMenu(), []);

  const load = useCallback(() => callApi({ period }, { onSuccess: (response) => { if (response.data) setDashboard(response.data); setReady(true); }, onError: () => setReady(true) }), [callApi, period]);
  useEffect(() => { setUser(getAuthUser()); load(); }, [load]);
  useEffect(() => {
    if (dashboard.audience !== "MANAGEMENT") return;
    loadTrend({ year: Number(period.split("-")[1]) }, { onSuccess: (response) => setTrend(response.data || []) });
  }, [dashboard.audience, loadTrend, period]);

  if (!ready || loading) return <div className="mt-6 space-y-4"><div className="h-20 animate-pulse rounded-md bg-slate-100" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-28 animate-pulse rounded-md bg-slate-100" />)}</div></div>;
  const resident = dashboard.audience === "RESIDENT";
  const summary = dashboard.summary;
  const paidPercentage = summary.total_bill_count ? Math.round((summary.paid_bill_count / summary.total_bill_count) * 100) : 0;
  const metrics = resident ? [
    { label: "Pendapatan Lingkungan", value: money(dashboard.income_summary.total_income), detail: "Seluruh sumber pendapatan", icon: Scale },
    { label: "Total Tagihan", value: money(summary.total_billed), detail: `${summary.total_bill_count} tagihan`, icon: ReceiptText },
    { label: "Sudah Dibayar", value: money(summary.recognized_income), detail: "Pembayaran dan saldo teralokasi", icon: CircleDollarSign },
    { label: "Sisa Tagihan", value: money(summary.outstanding_amount), detail: "Kewajiban yang belum lunas", icon: WalletCards },
    { label: "Saldo Kredit", value: money(summary.family_credit_balance), detail: "Tersedia untuk tagihan berikutnya", icon: Banknote },
    { label: "Payment Pending", value: money(summary.pending_payment_amount), detail: `${dashboard.pending_payment_count} menunggu verifikasi`, icon: Clock3 },
  ] : [
    { label: "Total Pendapatan", value: money(dashboard.income_summary.total_income), detail: "Seluruh sumber pendapatan", icon: CircleDollarSign },
    { label: "Pendapatan IPL", value: money(dashboard.income_summary.ipl_income), detail: "Pembayaran IPL disetujui", icon: ReceiptText },
    { label: "Iklan UMKM", value: money(dashboard.income_summary.umkm_ads_income), detail: "Subscription iklan disetujui", icon: Banknote },
    { label: "Total Tagihan", value: money(summary.total_billed), detail: `${summary.total_bill_count} tagihan`, icon: ReceiptText },
    { label: "Piutang", value: money(summary.outstanding_amount), detail: "Tagihan yang belum terbayar", icon: WalletCards },
    { label: "Payment Pending", value: money(summary.pending_payment_amount), detail: `${dashboard.pending_payment_count} menunggu verifikasi`, icon: Clock3 },
    { label: "Saldo Kredit", value: money(summary.family_credit_balance), detail: `${paidPercentage}% tagihan lunas`, icon: Scale },
  ];

  const actions = resident ? [{ label: "Lihat Tagihan", href: "/operation/tagihan", show: true }] : [
    { label: "Generate Bill", href: "/ipl/generate-bill", show: canAccessRoute(authMenu, "ipl/generate-bill", "READ") },
    { label: "Verifikasi Payment", href: "/ipl/verifikasi-payment", show: canAccessRoute(authMenu, "ipl/verifikasi-payment", "READ") },
    { label: "Laporan IPL", href: "/ipl/report", show: canAccessRoute(authMenu, "ipl/report", "READ") },
  ];
  const selectedMonth = monthCodes.indexOf(period.split("-")[0] || "") + 1;
  const selectedTrend = trend.find((item) => item.month === selectedMonth);
  const previousTrend = trend.find((item) => item.month === selectedMonth - 1);
  const incomeChange = previousTrend?.total_income
    ? ((Number(selectedTrend?.total_income || 0) - previousTrend.total_income) / previousTrend.total_income) * 100
    : null;

  return <div className="mt-6 space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">{resident ? "Keuangan Keluarga" : "Dashboard Keuangan"}</h1><p className="mt-1 text-sm text-slate-500">{resident ? `Ringkasan IPL keluarga ${dashboard.family_no_kk || "-"}` : `Ringkasan keuangan untuk ${user?.role_name || user?.role_code || "pengurus"}`}</p></div><Popover><PopoverTrigger asChild><Button variant="outline" className="w-fit"><CalendarDays className="h-4 w-4" />{period}<ChevronDown className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent align="end" className="w-auto p-0"><MonthYearPicker className="w-64 shadow-none" value={fromPeriod(period)} onChange={(value) => setPeriod(toPeriod(value))} /></PopoverContent></Popover></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</div>
    <div className="flex flex-wrap gap-2">{actions.filter((action) => action.show).map((action) => <Button key={action.href} variant="outline" asChild><Link href={action.href}>{action.label}<ArrowRight className="h-4 w-4" /></Link></Button>)}</div>
    <UmkmAdsCarousel />
    {!resident ? <Card><CardContent className="pt-6"><div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between"><div><h2 className="font-semibold text-slate-900">Tren Pendapatan {period.split("-")[1]}</h2><p className="mt-1 text-sm text-slate-500">Komposisi pendapatan berdasarkan sumber transaksi.</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span><span className="text-slate-500">Total {period}:</span> <strong>{money(selectedTrend?.total_income)}</strong></span><span><span className="text-slate-500">Perubahan:</span> <strong className={incomeChange !== null && incomeChange < 0 ? "text-red-600" : "text-emerald-600"}>{incomeChange === null ? "-" : `${incomeChange >= 0 ? "+" : ""}${incomeChange.toFixed(1)}%`}</strong></span></div></div><div className="inline-flex w-fit flex-wrap rounded-md border border-slate-200 p-1"><Button size="sm" variant={showTotalBilled ? "default" : "ghost"} onClick={() => setShowTotalBilled((value) => !value)}>Total Tagihan</Button><Button size="sm" variant={showIplIncome ? "default" : "ghost"} onClick={() => setShowIplIncome((value) => !value)}>IPL</Button><Button size="sm" variant={showUmkmAdsIncome ? "default" : "ghost"} onClick={() => setShowUmkmAdsIncome((value) => !value)}>Iklan UMKM</Button></div></div>{loadingTrend ? <div className="mt-5 h-80 animate-pulse rounded-md bg-slate-100" /> : <div className="mt-5"><FinancialTrendChart data={trend} showTotalBilled={showTotalBilled} showIplIncome={showIplIncome} showUmkmAdsIncome={showUmkmAdsIncome} /></div>}</CardContent></Card> : null}
    <div className="grid gap-6 xl:grid-cols-2"><Card><CardContent className="pt-6"><div className="mb-4"><h2 className="font-semibold text-slate-900">Tagihan Terbaru</h2><p className="text-sm text-slate-500">Tagihan pada periode {period}</p></div><AppDataTable data={dashboard.recent_bills} showMeta={false} onMetaChange={() => undefined} columns={[
      { field: "bill_number", header: "Tagihan" }, ...(!resident ? [{ field: "family_no_kk" as const, header: "No. KK" }] : []), { field: "amount", header: "Nominal", body: (row) => money(row.amount) }, { field: "remaining_amount", header: "Sisa", body: (row) => money(row.remaining_amount) }, { field: "status", header: "Status", body: (row) => <IplStatusBadge status={row.status} /> },
    ]} /></CardContent></Card><Card><CardContent className="pt-6"><div className="mb-4"><h2 className="font-semibold text-slate-900">Pembayaran Terbaru</h2><p className="text-sm text-slate-500">Aktivitas pembayaran terakhir</p></div><AppDataTable data={dashboard.recent_payments} showMeta={false} onMetaChange={() => undefined} columns={[
      { field: "bill_number", header: "Tagihan" }, { field: "payment_date", header: "Tanggal", body: (row) => formatDate(row.payment_date) }, { field: "amount", header: "Nominal", body: (row) => money(row.amount) }, { field: "status", header: "Status", body: (row) => <IplStatusBadge status={row.status} /> },
    ]} /></CardContent></Card></div>
    <Card><CardContent className="pt-6"><div className="mb-4"><h2 className="font-semibold text-slate-900">Pendapatan Terbaru</h2><p className="text-sm text-slate-500">Penerimaan yang telah disetujui pada periode {period}</p></div><AppDataTable data={dashboard.recent_transactions} showMeta={false} onMetaChange={() => undefined} columns={[
      { field: "transaction_type", header: "Sumber", body: (row) => <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${row.transaction_type === "IPL" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"}`}>{row.transaction_type === "UMKM_ADS" ? "Iklan UMKM" : row.transaction_type}</span> }, { field: "transaction_date", header: "Tanggal", body: (row) => formatDate(row.transaction_date) }, { field: "description", header: "Keterangan" }, { field: "amount", header: "Nominal", body: (row) => money(row.amount) },
    ]} /></CardContent></Card>
  </div>;
}
