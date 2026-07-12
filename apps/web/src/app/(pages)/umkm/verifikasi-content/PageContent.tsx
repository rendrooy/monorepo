"use client";
import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { UmkmStatusBadge } from "@/components/UmkmStatusBadge";
import { useApiService } from "@/hooks";
import { getAccessToken, getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import { formatDateTime } from "@/utils/format-date";
import type { Metadata, UmkmInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@monorepo/ui/components/dialog";
import { Label } from "@monorepo/ui/components/label";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Check, Eye, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
export default function PageContent() {
    const auth = useMemo(() => getAuthMenu(), []),
        canAction = useMemo(
            () => canAccessRoute(auth, "umkm/verifikasi-content", "ACTION"),
            [auth],
        );
    const [data, setData] = useState<UmkmInterface[]>([]),
        [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 }),
        [detail, setDetail] = useState<UmkmInterface | null>(null),
        [imageUrl, setImageUrl] = useState(""),
        [approveTarget, setApproveTarget] = useState<UmkmInterface | null>(null),
        [rejectTarget, setRejectTarget] = useState<UmkmInterface | null>(null),
        [reason, setReason] = useState("");
    const { callApi: load, loading } = useApiService("loadUmkmReview"),
        { callApi: approve, loading: approving } = useApiService("approveUmkm"),
        { callApi: reject, loading: rejecting } = useApiService("rejectUmkm");
    const reload = useCallback(
        () =>
            load(
                { params: {}, metadata: meta },
                {
                    onSuccess: (r) => {
                        setData(r.data || []);
                        setMeta((old) => ({ ...old, total: r.metaData?.total || 0 }));
                    },
                },
            ),
        [load, meta.page, meta.pageSize],
    );
    useEffect(() => {
        reload();
    }, [reload]);
    useEffect(() => {
        if (!detail?.revision_id) {
            setImageUrl("");
            return;
        }
        let url = "";
        fetch(
            `http://localhost:3001/v1/umkm/revision/${detail.revision_id}/image`,
            { headers: { Authorization: `Bearer ${getAccessToken()}` } },
        )
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((blob) => {
                url = URL.createObjectURL(blob);
                setImageUrl(url);
            })
            .catch(() => setImageUrl(""));
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [detail]);
    const approveNow = async () => {
        if (!approveTarget) return;
        await approve(
            { id: approveTarget.revision_id },
            {
                onSuccess: () => {
                    toast.success("Konten UMKM disetujui");
                    setApproveTarget(null);
                    reload();
                },
                onError: (e) => toast.error(e.message),
            },
        );
    };
    const rejectNow = async () => {
        if (!rejectTarget || !reason.trim()) return;
        await reject(
            { id: rejectTarget.revision_id, note: reason },
            {
                onSuccess: () => {
                    toast.success("Konten UMKM ditolak");
                    setRejectTarget(null);
                    setReason("");
                    reload();
                },
                onError: (e) => toast.error(e.message),
            },
        );
    };
    return (
        <div className="mt-6 space-y-6">
            <div className="border-b border-slate-200 pb-5">
                <h1 className="text-2xl font-bold">Verifikasi Konten UMKM</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Review profil dan gambar usaha yang diajukan warga.
                </p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <AppDataTable
                        data={data}
                        loading={loading}
                        meta={meta}
                        onMetaChange={setMeta}
                        columns={[
                            { field: "name", header: "Nama Usaha" },
                            { field: "owner_name", header: "Pemilik" },
                            { field: "family_no_kk", header: "No. KK" },
                            { field: "category_label", header: "Kategori" },
                            {
                                field: "created_time",
                                header: "Diajukan",
                                body: (r) => formatDateTime(r.created_time),
                            },
                            {
                                field: "status",
                                header: "Status",
                                body: (r) => <UmkmStatusBadge status={r.status} />,
                            },
                            {
                                header: "Aksi",
                                body: (r) => (
                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Detail"
                                            onClick={() => setDetail(r)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {canAction ? (
                                            <>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Approve"
                                                    onClick={() => setApproveTarget(r)}
                                                >
                                                    <Check className="h-4 w-4 text-emerald-600" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Reject"
                                                    onClick={() => {
                                                        setReason("");
                                                        setRejectTarget(r);
                                                    }}
                                                >
                                                    <X className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </CardContent>
            </Card>
            <Dialog
                open={detail !== null}
                onOpenChange={(open) => !open && setDetail(null)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detail Konten UMKM</DialogTitle>
                        <DialogDescription>
                            Versi {detail?.version_no} yang diajukan untuk ditinjau.
                        </DialogDescription>
                    </DialogHeader>
                    {detail ? (
                        <div className="space-y-4">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={detail.name || "UMKM"}
                                    className="aspect-[16/7] w-full rounded-md border object-cover"
                                />
                            ) : (
                                <div className="flex aspect-[16/7] items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">
                                    Gambar tidak tersedia
                                </div>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Info label="Nama" value={detail.name} />
                                <Info label="Kategori" value={detail.category_label} />
                                <Info label="Pemilik" value={detail.owner_name} />
                                <Info label="No. KK" value={detail.family_no_kk} />
                                <Info label="WhatsApp" value={detail.whatsapp} />
                                <Info label="Tautan" value={detail.external_url} />
                                <div className="sm:col-span-2">
                                    <Info label="Deskripsi" value={detail.description} />
                                </div>
                                <div className="sm:col-span-2">
                                    <Info label="Alamat" value={detail.address} />
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetail(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <SwalDialog
                open={approveTarget !== null}
                isLoading={approving}
                title="Setujui Konten?"
                message={`${approveTarget?.name || "UMKM"} akan disetujui dan dapat melanjutkan ke subscription.`}
                variant="info"
                confirmText="Approve"
                cancelText="Kembali"
                onCancel={() => setApproveTarget(null)}
                onConfirm={approveNow}
            />
            <Dialog
                open={rejectTarget !== null}
                onOpenChange={(open) => !open && setRejectTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak Konten UMKM</DialogTitle>
                        <DialogDescription>
                            Warga dapat memperbaiki dan mengajukan ulang kontennya.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>Alasan Penolakan</Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectTarget(null)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={rejecting || !reason.trim()}
                            onClick={rejectNow}
                        >
                            Tolak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
function Info({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-medium text-slate-900 break-words">
                {value || "-"}
            </div>
        </div>
    );
}
