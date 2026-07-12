"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { UmkmFormDialog } from "@/components/UmkmFormDialog";
import { UmkmStatusBadge } from "@/components/UmkmStatusBadge";
import { UmkmSubscriptionPanel } from "@/components/UmkmSubscriptionPanel";
import { useApiService } from "@/hooks";
import type {
    Metadata,
    UmkmCategoryOption,
    UmkmInterface,
    UmkmSubscriptionPlanInterface,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { PauseCircle, Pencil, PlayCircle, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const [data, setData] = useState<UmkmInterface[]>([]);
    const [categories, setCategories] = useState<UmkmCategoryOption[]>([]);
    const [plans, setPlans] = useState<UmkmSubscriptionPlanInterface[]>([]);
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<UmkmInterface | null>(null);
    const [submitTarget, setSubmitTarget] = useState<UmkmInterface | null>(null);
    const [operationalTarget, setOperationalTarget] =
        useState<UmkmInterface | null>(null);
    const { callApi: load, loading } = useApiService("loadMyUmkm");
    const { callApi: getCategories } = useApiService("getUmkmCategories");
    const { callApi: getPlans } = useApiService("loadActiveUmkmPlans");
    const { callApi: save, loading: saving } = useApiService("saveUmkmDraft");
    const { callApi: submit, loading: submitting } = useApiService("submitUmkm");
    const { callApi: suspend, loading: suspending } =
        useApiService("suspendUmkm");
    const { callApi: resume, loading: resuming } = useApiService("resumeUmkm");

    const reload = useCallback(() => {
        load(
            { params: {}, metadata: meta },
            {
                onSuccess: (response) => {
                    setData(response.data || []);
                    setMeta((current) => ({
                        ...current,
                        total: response.metaData?.total || 0,
                    }));
                },
            },
        );
    }, [load, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

    useEffect(() => {
        reload();
    }, [reload]);
    useEffect(() => {
        getCategories(
            {},
            { onSuccess: (response) => setCategories(response.data || []) },
        );
        getPlans({}, { onSuccess: (response) => setPlans(response.data || []) });
    }, [getCategories, getPlans]);

    const saveDraft = async (value: UmkmInterface) => {
        await save(value, {
            onSuccess: () => {
                toast.success("Draft UMKM disimpan");
                setFormOpen(false);
                setEditing(null);
                reload();
            },
            onError: (error) => toast.error(error.message || "Gagal menyimpan UMKM"),
        });
    };
    const send = async () => {
        if (!submitTarget) return;
        await submit(
            { id: submitTarget.id },
            {
                onSuccess: () => {
                    toast.success("Konten dan pembayaran diajukan");
                    setSubmitTarget(null);
                    reload();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    };
    const changeOperationalStatus = async () => {
        if (!operationalTarget) return;
        const isSuspended = operationalTarget.operational_status === "SUSPENDED";
        const call = isSuspended ? resume : suspend;
        await call(
            { id: operationalTarget.id },
            {
                onSuccess: () => {
                    toast.success(
                        isSuspended ? "UMKM diaktifkan kembali" : "UMKM ditangguhkan",
                    );
                    setOperationalTarget(null);
                    reload();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    };

    return (
        <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">UMKM Saya</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Kelola konten, paket, pembayaran, dan penayangan iklan.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4" />
                    Tambah UMKM
                </Button>
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
                            { field: "category_label", header: "Kategori" },
                            { field: "version_no", header: "Versi" },
                            {
                                field: "status",
                                header: "Status Konten",
                                body: (row) => <UmkmStatusBadge status={row.status} />,
                            },
                            {
                                field: "review_note",
                                header: "Catatan Review",
                                body: (row) => row.review_note || "-",
                            },
                            {
                                header: "Aksi",
                                body: (row) => (
                                    <div className="flex gap-1">
                                        {row.status !== "PENDING_REVIEW" ? (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title="Edit"
                                                onClick={() => {
                                                    setEditing(row);
                                                    setFormOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        ) : null}
                                        {row.status === "DRAFT" ? (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title="Ajukan review"
                                                onClick={() => setSubmitTarget(row)}
                                            >
                                                <Send className="h-4 w-4 text-blue-600" />
                                            </Button>
                                        ) : null}
                                        {row.approved_revision_id ? (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title={
                                                    row.operational_status === "SUSPENDED"
                                                        ? "Aktifkan kembali"
                                                        : "Tangguhkan"
                                                }
                                                onClick={() => setOperationalTarget(row)}
                                            >
                                                {row.operational_status === "SUSPENDED" ? (
                                                    <PlayCircle className="h-4 w-4 text-emerald-600" />
                                                ) : (
                                                    <PauseCircle className="h-4 w-4 text-amber-600" />
                                                )}
                                            </Button>
                                        ) : null}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </CardContent>
            </Card>
            <UmkmSubscriptionPanel businesses={data} />
            <UmkmFormDialog
                open={formOpen}
                item={editing}
                categories={categories}
                plans={plans}
                loading={saving}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                onSubmit={saveDraft}
            />
            <SwalDialog
                open={submitTarget !== null}
                isLoading={submitting}
                title="Ajukan UMKM?"
                message="Konten akan diperiksa KRT/KRW, lalu pembayaran diperiksa Bendahara."
                variant="info"
                confirmText="Ajukan"
                cancelText="Kembali"
                onCancel={() => setSubmitTarget(null)}
                onConfirm={send}
            />
            <SwalDialog
                open={operationalTarget !== null}
                isLoading={suspending || resuming}
                title={
                    operationalTarget?.operational_status === "SUSPENDED"
                        ? "Aktifkan UMKM?"
                        : "Tangguhkan UMKM?"
                }
                message={
                    operationalTarget?.operational_status === "SUSPENDED"
                        ? "Iklan dapat tampil kembali selama subscription masih aktif."
                        : "Iklan berhenti tampil, tetapi masa subscription tetap berjalan."
                }
                variant="info"
                confirmText={
                    operationalTarget?.operational_status === "SUSPENDED"
                        ? "Aktifkan"
                        : "Tangguhkan"
                }
                cancelText="Kembali"
                onCancel={() => setOperationalTarget(null)}
                onConfirm={changeOperationalStatus}
            />
        </div>
    );
}
