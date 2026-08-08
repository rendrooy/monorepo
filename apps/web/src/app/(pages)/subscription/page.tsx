"use client";

import type { Metadata, PlatformPlanCode, PlatformPlanInterface, TenantBillingSummaryInterface, TenantInvoiceInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { HardDrive, Package, ReceiptText, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppDataTable } from "@/components/DataTable";
import { PlatformStatusBadge } from "@/components/PlatformStatusBadge";
import { useApiService } from "@/hooks";
import { API_BASE_URL } from "@/services/platform-api";
import { getAccessToken } from "@/utils/auth-storage";

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const storage = (value: number) => value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} GB` : `${(value / 1024 ** 2).toFixed(1)} MB`;
const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });

export default function TenantSubscriptionPage() {
  const [summary, setSummary] = useState<TenantBillingSummaryInterface | null>(null);
  const [invoices, setInvoices] = useState<TenantInvoiceInterface[]>([]);
  const [plans, setPlans] = useState<PlatformPlanInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [planCode, setPlanCode] = useState<PlatformPlanCode | "">("");
  const [paying, setPaying] = useState<TenantInvoiceInterface | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [paidTime, setPaidTime] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const { callApi: getSummary, loading } = useApiService("getTenantBillingSummary");
  const { callApi: loadInvoices } = useApiService("loadTenantInvoices");
  const { callApi: loadPlans } = useApiService("loadPlatformPlansForTenant");
  const { callApi: requestPlan, loading: requesting } = useApiService("requestTenantPlanChange");
  const { callApi: createPayment, loading: payingLoading } = useApiService("createTenantSubscriptionPayment");

  const load = useCallback(() => {
    getSummary({}, { onSuccess: (response) => setSummary(response.data || null), onError: (error) => toast.error(error.message) });
    loadInvoices({ params: {}, metadata: meta }, { onSuccess: (response) => { setInvoices(response.data || []); setMeta((value) => ({ ...value, total: response.metaData?.total || 0 })); } });
    loadPlans({}, { onSuccess: (response) => setPlans(response.data || []) });
  }, [getSummary, loadInvoices, loadPlans, meta.page, meta.pageSize]);
  useEffect(() => { load(); }, [load]);

  const submitPlan = async () => {
    if (!planCode) return;
    await requestPlan({ plan_code: planCode }, { onSuccess: () => { toast.success("Perubahan paket diajukan"); setPlanCode(""); load(); }, onError: (error) => toast.error(error.message) });
  };
  const submitPayment = async () => {
    if (!paying || !file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran bukti maksimal 5 MB"); return; }
    await createPayment({ invoice_id: paying.id, amount: paying.amount, paid_time: paidTime, provider_reference: reference, proof_original_name: file.name, proof_data: await toBase64(file) }, { onSuccess: () => { toast.success("Bukti pembayaran dikirim"); setPaying(null); setFile(null); setReference(""); load(); }, onError: (error) => toast.error(error.message) });
  };
  const openProof = async (paymentId: string) => {
    const response = await fetch(`${API_BASE_URL}/platform-billing/payment/${paymentId}/proof`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!response.ok) { toast.error("Bukti pembayaran gagal dibuka"); return; }
    const url = URL.createObjectURL(await response.blob()); window.open(url, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const usagePercent = summary?.storage_limit_bytes ? Math.min(100, (summary.storage_usage_bytes / summary.storage_limit_bytes) * 100) : 0;
  return <div className="mt-6 space-y-6"><div className="border-b border-slate-200 pb-5"><h1 className="text-2xl font-semibold">Subscription</h1><p className="mt-1 text-sm text-slate-500">Kelola paket, kapasitas penyimpanan, invoice, dan pembayaran HomeHub.</p></div>{summary ? <><div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="flex items-start gap-4 pt-6"><div className="rounded-md bg-blue-50 p-2 text-blue-700"><Package className="h-5 w-5" /></div><div><p className="text-sm text-slate-500">Paket Aktif</p><p className="mt-1 text-xl font-semibold">{summary.plan.name}</p><div className="mt-2"><PlatformStatusBadge status={summary.subscription_status} /></div></div></CardContent></Card><Card><CardContent className="flex items-start gap-4 pt-6"><div className="rounded-md bg-emerald-50 p-2 text-emerald-700"><ReceiptText className="h-5 w-5" /></div><div><p className="text-sm text-slate-500">Tagihan Terakhir</p><p className="mt-1 text-xl font-semibold">{summary.invoice ? money(summary.invoice.amount) : "-"}</p><div className="mt-2"><PlatformStatusBadge status={summary.invoice?.status} /></div></div></CardContent></Card><Card><CardContent className="pt-6"><div className="flex items-start gap-4"><div className="rounded-md bg-amber-50 p-2 text-amber-700"><HardDrive className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm text-slate-500">Storage</p><p className="mt-1 text-base font-semibold">{storage(summary.storage_usage_bytes)} / {storage(summary.storage_limit_bytes)}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-amber-500" style={{ width: `${usagePercent}%` }} /></div></div></div></CardContent></Card></div><Card><CardContent className="pt-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-semibold">Perubahan Paket</h2><p className="mt-1 text-sm text-slate-500">Berlaku periode berikutnya setelah disetujui Super Admin.</p>{summary.next_plan_code ? <p className="mt-2 text-sm font-medium text-amber-700">Menunggu persetujuan: {summary.next_plan_code}</p> : null}</div><div className="flex w-full gap-2 sm:w-auto"><select className="h-9 min-w-44 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm" value={planCode} onChange={(event) => setPlanCode(event.target.value as PlatformPlanCode)}><option value="">Pilih paket</option>{plans.filter((plan) => plan.code !== summary.plan.code).map((plan) => <option key={plan.id} value={plan.code}>{plan.name} · {money(plan.price)}</option>)}</select><Button disabled={!planCode || requesting || Boolean(summary.next_plan_code)} onClick={submitPlan}>Ajukan</Button></div></div></CardContent></Card></> : null}
    <Card><CardContent className="pt-6"><h2 className="mb-4 font-semibold">Riwayat Invoice</h2><AppDataTable data={invoices} loading={loading} meta={meta} onMetaChange={setMeta} columns={[{ field: "invoice_number", header: "Invoice" },{ field: "billing_period", header: "Periode" },{ field: "plan_name", header: "Paket" },{ field: "amount", header: "Nominal", body: (row) => money(row.amount) },{ field: "due_date", header: "Jatuh Tempo" },{ field: "status", header: "Status", body: (row) => <PlatformStatusBadge status={row.status} /> },{ header: "Aksi", body: (row) => row.payment_id ? <Button size="sm" variant="outline" onClick={() => openProof(row.payment_id!)}>Lihat Bukti</Button> : ["ISSUED", "OVERDUE"].includes(row.status) ? <Button size="sm" onClick={() => setPaying(row)}><Upload className="h-4 w-4" />Bayar</Button> : "-" }]} /></CardContent></Card>
    <Dialog open={Boolean(paying)} onOpenChange={(open) => !open && setPaying(null)}><DialogContent><DialogHeader><DialogTitle>Upload Bukti Pembayaran</DialogTitle><DialogDescription>{paying?.invoice_number} · {money(paying?.amount || 0)}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Tanggal Pembayaran</Label><Input type="date" value={paidTime} onChange={(event) => setPaidTime(event.target.value)} /></div><div className="space-y-2"><Label>Nomor Referensi</Label><Input placeholder="Opsional" value={reference} onChange={(event) => setReference(event.target.value)} /></div><div className="space-y-2"><Label>Bukti Pembayaran</Label><Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /><p className="text-xs text-slate-500">JPEG, PNG, atau PDF. Maksimal 5 MB.</p></div></div><DialogFooter><Button variant="outline" onClick={() => setPaying(null)}>Batal</Button><Button disabled={!file || payingLoading} onClick={submitPayment}>{payingLoading ? "Mengirim..." : "Kirim Bukti"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
