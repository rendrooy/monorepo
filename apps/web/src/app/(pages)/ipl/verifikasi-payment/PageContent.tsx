"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { IplPaymentDialog } from "@/components/IplPaymentDialog";
import { IplStatusBadge } from "@/components/IplStatusBadge";
import { useApiService } from "@/hooks";
import { formatDate } from "@/utils/format-date";
import { getAccessToken, getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type { IplBillInterface, IplPaymentInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Check, Eye, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const money = (value?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function PageContent() {
  const authMenu = useMemo(() => getAuthMenu(), []);
  const canAdd = useMemo(() => canAccessRoute(authMenu, "ipl/verifikasi-payment", "ADD"), [authMenu]);
  const canAction = useMemo(() => canAccessRoute(authMenu, "ipl/verifikasi-payment", "ACTION"), [authMenu]);
  const [data, setData] = useState<IplPaymentInterface[]>([]);
  const [bills, setBills] = useState<IplBillInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [filter, setFilter] = useState({ period: "", family_no_kk: "", status: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<IplPaymentInterface | null>(null);
  const [approveTarget, setApproveTarget] = useState<IplPaymentInterface | null>(null);
  const [reasonAction, setReasonAction] = useState<{ type: "REJECT" | "REVERSE"; payment: IplPaymentInterface } | null>(null);
  const [reason, setReason] = useState("");
  const { callApi: loadPayments, loading } = useApiService("loadIplPayment");
  const { callApi: loadBills } = useApiService("loadIplBill");
  const { callApi: createPayment, loading: creating } = useApiService("createIplPayment");
  const { callApi: approvePayment, loading: approving } = useApiService("approveIplPayment");
  const { callApi: rejectPayment, loading: rejecting } = useApiService("rejectIplPayment");
  const { callApi: reversePayment, loading: reversing } = useApiService("reverseIplPayment");

  const reload = useCallback(() => {
    loadPayments({ params: { period: filter.period || undefined, family_no_kk: filter.family_no_kk || undefined, status: (filter.status || undefined) as IplPaymentInterface["status"] }, metadata: meta }, {
      onSuccess: (response) => { setData(response.data || []); setMeta((old) => ({ ...old, total: response.metaData?.total || 0 })); },
    });
  }, [filter.family_no_kk, filter.period, filter.status, loadPayments, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

  const refreshBills = useCallback(() => loadBills({ params: {}, metadata: { page: 1, pageSize: 100 } }, { onSuccess: (response) => setBills((response.data || []).filter((bill: IplBillInterface) => !["PAID", "OVERPAID", "CANCELLED"].includes(bill.status || ""))) }), [loadBills]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { refreshBills(); }, [refreshBills]);

  const openProof = async (payment: IplPaymentInterface) => {
    const response = await fetch(`http://localhost:3001/v1/operation/ipl/payment/${payment.id}/proof`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!response.ok) { toast.error("Bukti pembayaran tidak dapat dibuka"); return; }
    window.open(URL.createObjectURL(await response.blob()), "_blank", "noopener,noreferrer");
  };

  const create = async (payment: IplPaymentInterface) => {
    await createPayment(payment, { onSuccess: () => { toast.success("Pembayaran berhasil dicatat dan disetujui"); setCreateOpen(false); reload(); refreshBills(); }, onError: (error) => toast.error(error.message || "Pembayaran gagal dicatat") });
  };
  const approve = async () => { if (!approveTarget) return; await approvePayment({ id: approveTarget.id }, { onSuccess: () => { toast.success("Pembayaran disetujui"); setApproveTarget(null); reload(); refreshBills(); }, onError: (error) => toast.error(error.message) }); };
  const submitReason = async () => {
    if (!reasonAction || !reason.trim()) { toast.error("Alasan wajib diisi"); return; }
    const call = reasonAction.type === "REJECT" ? rejectPayment : reversePayment;
    await call({ id: reasonAction.payment.id, note: reason }, { onSuccess: () => { toast.success(reasonAction.type === "REJECT" ? "Pembayaran ditolak" : "Pembayaran direversal"); setReasonAction(null); setReason(""); reload(); refreshBills(); }, onError: (error) => toast.error(error.message) });
  };

  return <div className="mt-6 space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Verifikasi Payment</h1><p className="mt-1 text-sm text-slate-500">Periksa bukti pembayaran dan catat pembayaran atas nama warga.</p></div>{canAdd ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Tambah Pembayaran</Button> : null}</div>
    <FilterPanel columns={3} onSubmit={() => setMeta((old) => ({ ...old, page: 1 }))} onReset={() => setFilter({ period: "", family_no_kk: "", status: "" })}><div><Label>Periode</Label><Input className="mt-2" value={filter.period} onChange={(event) => setFilter((old) => ({ ...old, period: event.target.value.toUpperCase() }))} /></div><div><Label>No. KK</Label><Input className="mt-2" value={filter.family_no_kk} onChange={(event) => setFilter((old) => ({ ...old, family_no_kk: event.target.value }))} /></div><div><Label>Status</Label><Input className="mt-2" placeholder="PENDING / APPROVED" value={filter.status} onChange={(event) => setFilter((old) => ({ ...old, status: event.target.value.toUpperCase() }))} /></div></FilterPanel>
    <Card><CardContent className="pt-6"><AppDataTable data={data} loading={loading} meta={meta} onMetaChange={setMeta} columns={[
      { field: "bill_number", header: "Tagihan", sortable: true }, { field: "period", header: "Periode" }, { field: "family_no_kk", header: "No. KK" },
      { field: "amount", header: "Nominal", body: (row) => money(row.amount) }, { field: "payment_date", header: "Tanggal Bayar", body: (row) => formatDate(row.payment_date) }, { field: "payment_method", header: "Metode" },
      { field: "status", header: "Status", body: (row) => <IplStatusBadge status={row.status} /> },
      { header: "Aksi", body: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Detail pembayaran" onClick={() => setDetailPayment(row)}><Eye className="h-4 w-4" /></Button>{canAction && row.status === "PENDING" ? <><Button size="icon" variant="ghost" title="Approve" onClick={() => setApproveTarget(row)}><Check className="h-4 w-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" title="Reject" onClick={() => { setReason(""); setReasonAction({ type: "REJECT", payment: row }); }}><X className="h-4 w-4 text-red-600" /></Button></> : null}{canAction && row.status === "APPROVED" ? <Button size="icon" variant="ghost" title="Reversal" onClick={() => { setReason(""); setReasonAction({ type: "REVERSE", payment: row }); }}><RotateCcw className="h-4 w-4 text-amber-600" /></Button> : null}</div> },
    ]} /></CardContent></Card>
    <IplPaymentDialog open={createOpen} bills={bills} adminMode loading={creating} onOpenChange={setCreateOpen} onSubmit={create} />
    <Dialog open={detailPayment !== null} onOpenChange={(open) => !open && setDetailPayment(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Detail Pembayaran</DialogTitle><DialogDescription>Informasi pengajuan dan hasil verifikasi pembayaran IPL.</DialogDescription></DialogHeader>{detailPayment ? <div className="space-y-5">
      <div className="grid gap-x-6 gap-y-4 rounded-md border border-slate-200 p-4 sm:grid-cols-2">
        <div><div className="text-xs text-slate-500">Nomor Tagihan</div><div className="mt-1 font-medium text-slate-900">{detailPayment.bill_number || "-"}</div></div>
        <div><div className="text-xs text-slate-500">Periode</div><div className="mt-1 font-medium text-slate-900">{detailPayment.period || "-"}</div></div>
        <div><div className="text-xs text-slate-500">Nomor KK</div><div className="mt-1 font-medium text-slate-900">{detailPayment.family_no_kk || "-"}</div></div>
        <div><div className="text-xs text-slate-500">Alamat</div><div className="mt-1 font-medium text-slate-900">{detailPayment.family_address || "-"}</div></div>
        <div><div className="text-xs text-slate-500">Nominal Pembayaran</div><div className="mt-1 font-medium text-slate-900">{money(detailPayment.amount)}</div></div>
        <div><div className="text-xs text-slate-500">Tanggal Pembayaran</div><div className="mt-1 font-medium text-slate-900">{formatDate(detailPayment.payment_date)}</div></div>
        <div><div className="text-xs text-slate-500">Metode</div><div className="mt-1 font-medium text-slate-900">{detailPayment.payment_method || "-"}</div></div>
        <div><div className="text-xs text-slate-500">Nomor Referensi</div><div className="mt-1 font-medium text-slate-900">{detailPayment.reference_number || "-"}</div></div>
        <div><div className="text-xs text-slate-500">Status</div><IplStatusBadge className="mt-1" status={detailPayment.status} /></div>
        <div><div className="text-xs text-slate-500">Diajukan Oleh</div><div className="mt-1 font-medium text-slate-900">{detailPayment.submitted_by_role || "-"}</div></div>
        <div className="sm:col-span-2"><div className="text-xs text-slate-500">Catatan</div><div className="mt-1 text-sm text-slate-900">{detailPayment.note || "-"}</div></div>
        {detailPayment.rejection_note || detailPayment.reversal_note ? <div className="sm:col-span-2"><div className="text-xs text-slate-500">Catatan Admin</div><div className="mt-1 text-sm text-red-700">{detailPayment.rejection_note || detailPayment.reversal_note}</div></div> : null}
      </div>
      <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"><div><div className="text-sm font-medium text-slate-800">{detailPayment.proof_original_name}</div><div className="text-xs text-slate-500">Bukti pembayaran</div></div><Button variant="outline" onClick={() => openProof(detailPayment)}><Eye className="h-4 w-4" />Lihat Bukti</Button></div>
    </div> : null}<DialogFooter><Button variant="outline" onClick={() => setDetailPayment(null)}>Tutup</Button></DialogFooter></DialogContent></Dialog>
    <SwalDialog open={approveTarget !== null} isLoading={approving} title="Setujui Pembayaran?" message={`Pembayaran ${approveTarget?.bill_number || ""} akan mengurangi tagihan dan kelebihannya menjadi saldo kredit.`} variant="info" confirmText="Approve" cancelText="Kembali" onCancel={() => setApproveTarget(null)} onConfirm={approve} />
    <Dialog open={reasonAction !== null} onOpenChange={(open) => !open && setReasonAction(null)}><DialogContent><DialogHeader><DialogTitle>{reasonAction?.type === "REJECT" ? "Tolak Pembayaran" : "Reversal Pembayaran"}</DialogTitle><DialogDescription>Tindakan ini tercatat pada audit pembayaran dan warga akan menerima notifikasi.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="action_reason">Alasan</Label><Textarea id="action_reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setReasonAction(null)}>Batal</Button><Button variant="destructive" disabled={rejecting || reversing || !reason.trim()} onClick={submitReason}>{reasonAction?.type === "REJECT" ? "Tolak" : "Lakukan Reversal"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
