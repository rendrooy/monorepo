"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import { getAccessToken } from "@/utils/auth-storage";
import { formatDate } from "@/utils/format-date";
import type { Metadata, UmkmSubscriptionInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Label } from "@monorepo/ui/components/label";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Check, Eye, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const money = (value?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function PageContent() {
    const [data, setData] = useState<UmkmSubscriptionInterface[]>([]);
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const [detail, setDetail] = useState<UmkmSubscriptionInterface | null>(null);
    const [approveTarget, setApproveTarget] = useState<UmkmSubscriptionInterface | null>(null);
    const [rejectTarget, setRejectTarget] = useState<UmkmSubscriptionInterface | null>(null);
    const [reason, setReason] = useState("");
    const { callApi: load, loading } = useApiService("loadUmkmPaymentReviews");
    const { callApi: approve, loading: approving } = useApiService("approveUmkmPayment");
    const { callApi: reject, loading: rejecting } = useApiService("rejectUmkmPayment");

    const reload = useCallback(() => {
        load({ params: {}, metadata: meta }, { onSuccess: response => {
            setData(response.data || []);
            setMeta(current => ({ ...current, total: response.metaData?.total || 0 }));
        }});
    }, [load, meta.page, meta.pageSize]);
    useEffect(() => { reload(); }, [reload]);

    const openProof = async (subscription: UmkmSubscriptionInterface) => {
        const response = await fetch(`http://localhost:3001/v1/umkm/subscription/payment/${subscription.id}/proof`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
        if (!response.ok) return toast.error("Bukti pembayaran tidak dapat dibuka");
        window.open(URL.createObjectURL(await response.blob()), "_blank", "noopener,noreferrer");
    };
    const approvePayment = async () => {
        if (!approveTarget) return;
        await approve({ id: approveTarget.id }, { onSuccess: () => {
            toast.success("Pembayaran disetujui, iklan siap dirilis warga");
            setApproveTarget(null);
            setDetail(null);
            reload();
        }, onError: error => toast.error(error.message) });
    };
    const rejectPayment = async () => {
        if (!rejectTarget || !reason.trim()) return;
        await reject({ id: rejectTarget.id, note: reason }, { onSuccess: () => {
            toast.success("Pembayaran ditolak");
            setRejectTarget(null);
            setReason("");
            setDetail(null);
            reload();
        }, onError: error => toast.error(error.message) });
    };

    return <div className="mt-6 space-y-6">
        <div className="border-b pb-5"><h1 className="text-2xl font-bold">Verifikasi Pembayaran UMKM</h1><p className="mt-1 text-sm text-slate-500">Pembayaran yang disetujui menjadi siap dirilis oleh warga pemilik UMKM.</p></div>
        <Card><CardContent className="pt-6"><AppDataTable data={data} loading={loading} meta={meta} onMetaChange={setMeta} columns={[
            { field: "umkm_name", header: "UMKM" }, { field: "owner_name", header: "Pemilik" }, { field: "plan_name", header: "Paket" },
            { field: "amount", header: "Nominal", body: row => money(row.amount) }, { field: "payment_date", header: "Tanggal", body: row => formatDate(row.payment_date) },
            { header: "Aksi", body: row => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Detail" onClick={() => setDetail(row)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Approve" onClick={() => setApproveTarget(row)}><Check className="h-4 w-4 text-emerald-600" /></Button><Button size="icon" variant="ghost" title="Reject" onClick={() => setRejectTarget(row)}><X className="h-4 w-4 text-red-600" /></Button></div> },
        ]} /></CardContent></Card>
        <Dialog open={Boolean(detail)} onOpenChange={open => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>Detail Pembayaran</DialogTitle><DialogDescription>Informasi paket dan bukti pembayaran warga.</DialogDescription></DialogHeader>{detail ? <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-slate-500">UMKM</span><div className="font-medium">{detail.umkm_name}</div></div><div><span className="text-slate-500">Pemilik</span><div className="font-medium">{detail.owner_name}</div></div><div><span className="text-slate-500">Paket</span><div className="font-medium">{detail.plan_name}</div></div><div><span className="text-slate-500">Nominal</span><div className="font-medium">{money(detail.amount)}</div></div><div><span className="text-slate-500">Tanggal Bayar</span><div className="font-medium">{formatDate(detail.payment_date)}</div></div><div><span className="text-slate-500">Metode</span><div className="font-medium">{detail.payment_method}</div></div><div className="col-span-2"><Button variant="outline" onClick={() => openProof(detail)}><Eye className="h-4 w-4" />Lihat Bukti</Button></div></div> : null}<DialogFooter><Button variant="outline" onClick={() => setDetail(null)}>Tutup</Button></DialogFooter></DialogContent></Dialog>
        <SwalDialog open={Boolean(approveTarget)} isLoading={approving} title="Setujui Pembayaran?" message="Iklan akan berstatus siap dirilis. Masa tayang baru dimulai ketika warga menekan tombol Rilis." variant="info" confirmText="Approve" cancelText="Kembali" onCancel={() => setApproveTarget(null)} onConfirm={approvePayment} />
        <Dialog open={Boolean(rejectTarget)} onOpenChange={open => !open && setRejectTarget(null)}><DialogContent><DialogHeader><DialogTitle>Tolak Pembayaran</DialogTitle><DialogDescription>Warga dapat mengunggah ulang bukti setelah pembayaran ditolak.</DialogDescription></DialogHeader><div><Label>Alasan</Label><Textarea value={reason} onChange={event => setReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button><Button variant="destructive" disabled={rejecting || !reason.trim()} onClick={rejectPayment}>Tolak</Button></DialogFooter></DialogContent></Dialog>
    </div>;
}
