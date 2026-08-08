"use client";

import type { Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Label } from "@monorepo/ui/components/label";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Check, Eye, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppDataTable } from "@/components/DataTable";
import { PlatformStatusBadge } from "@/components/PlatformStatusBadge";
import { openPlatformProof, platformApi } from "@/services/platform-api";

interface PaymentRow { id: string; tenant_code: string; tenant_name: string; invoice_number: string; amount: number; status: string; provider_reference?: null | string; paid_time?: null | string; created_time: string; rejection_note?: null | string; }
const dateTime = (value?: null | string) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

export default function PlatformPaymentsPage() {
  const [data, setData] = useState<PaymentRow[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<PaymentRow | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await platformApi<PaymentRow[]>("/platform/subscription/payment/load", { params: { status }, metadata: meta }); setData(response.data || []); setMeta((value) => ({ ...value, total: response.metaData?.total || 0 })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Pembayaran gagal dimuat"); }
    finally { setLoading(false); }
  }, [meta.page, meta.pageSize, status]);
  useEffect(() => { load(); }, [load]);

  const review = async () => {
    if (!target || !decision) return;
    setLoading(true);
    try { await platformApi(`/platform/subscription/payment/${decision === "APPROVE" ? "approve" : "reject"}`, { payment_id: target.id, note }); toast.success(decision === "APPROVE" ? "Pembayaran disetujui" : "Pembayaran ditolak"); setTarget(null); setDecision(null); setNote(""); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Review gagal"); }
    finally { setLoading(false); }
  };

  return <div className="space-y-6"><div className="border-b border-slate-200 pb-5"><h1 className="text-2xl font-semibold text-slate-900">Pembayaran Subscription</h1><p className="mt-1 text-sm text-slate-500">Verifikasi pembayaran platform secara manual.</p></div><Card><CardContent className="pt-6"><div className="mb-5 flex items-center gap-3"><Label htmlFor="payment-status">Status</Label><select id="payment-status" className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setMeta((value) => ({ ...value, page: 1 })); }}><option value="PENDING">Pending</option><option value="APPROVED">Disetujui</option><option value="REJECTED">Ditolak</option><option value="ALL">Semua</option></select></div><AppDataTable data={data} loading={loading} meta={meta} onMetaChange={setMeta} columns={[{ field: "tenant_code", header: "Tenant" },{ field: "invoice_number", header: "Invoice" },{ field: "amount", header: "Nominal", body: (row) => `Rp ${row.amount.toLocaleString("id-ID")}` },{ field: "paid_time", header: "Waktu Bayar", body: (row) => dateTime(row.paid_time) },{ field: "status", header: "Status", body: (row) => <PlatformStatusBadge status={row.status} /> },{ header: "Aksi", body: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Lihat bukti" onClick={() => openPlatformProof(row.id).catch((error) => toast.error(error.message))}><Eye className="h-4 w-4" /></Button>{row.status === "PENDING" ? <><Button size="icon" variant="ghost" title="Setujui" onClick={() => { setTarget(row); setDecision("APPROVE"); }}><Check className="h-4 w-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" title="Tolak" onClick={() => { setTarget(row); setDecision("REJECT"); }}><X className="h-4 w-4 text-red-600" /></Button></> : null}</div> }]} /></CardContent></Card>
    <Dialog open={Boolean(target && decision)} onOpenChange={(open) => { if (!open) { setTarget(null); setDecision(null); setNote(""); } }}><DialogContent><DialogHeader><DialogTitle>{decision === "APPROVE" ? "Setujui pembayaran" : "Tolak pembayaran"}</DialogTitle><DialogDescription>{target?.tenant_name} · {target?.invoice_number} · Rp {target?.amount.toLocaleString("id-ID")}</DialogDescription></DialogHeader><div className="space-y-3 border-y border-slate-200 py-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Referensi</span><span>{target?.provider_reference || "-"}</span></div><div className="flex justify-between"><span className="text-slate-500">Tanggal bayar</span><span>{dateTime(target?.paid_time)}</span></div><Button variant="outline" className="w-full" onClick={() => target && openPlatformProof(target.id).catch((error) => toast.error(error.message))}><Eye className="h-4 w-4" />Lihat Bukti</Button>{decision === "REJECT" ? <div className="space-y-2 pt-2"><Label htmlFor="rejection-note">Alasan Penolakan</Label><Textarea id="rejection-note" value={note} onChange={(event) => setNote(event.target.value)} /></div> : null}</div><DialogFooter><Button variant="outline" onClick={() => { setTarget(null); setDecision(null); }}>Batal</Button><Button variant={decision === "REJECT" ? "destructive" : "default"} disabled={loading || (decision === "REJECT" && !note.trim())} onClick={review}>{loading ? "Memproses..." : decision === "APPROVE" ? "Setujui" : "Tolak"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
