"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import type {
    UmkmInterface,
    UmkmSubscriptionInterface,
    UmkmSubscriptionPlanInterface,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@monorepo/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@monorepo/ui/components/select";
import { Textarea } from "@monorepo/ui/components/textarea";
import { CreditCard, PackagePlus, Rocket, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_CONTENT_REVIEW: "Menunggu Review Konten",
    CONTENT_REJECTED: "Konten Ditolak",
    PENDING_PAYMENT_REVIEW: "Menunggu Review Pembayaran",
    PAYMENT_REJECTED: "Pembayaran Ditolak",
    READY_TO_RELEASE: "Siap Dirilis",
    ACTIVE: "Tayang",
    EXPIRED: "Berakhir",
    CANCELLED: "Dibatalkan",
};
const money = (value?: number | null) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

export function UmkmSubscriptionPanel({
    businesses,
}: Readonly<{ businesses: UmkmInterface[] }>) {
    const [plans, setPlans] = useState<UmkmSubscriptionPlanInterface[]>([]);
    const [rows, setRows] = useState<UmkmSubscriptionInterface[]>([]);
    const [renewBusiness, setRenewBusiness] = useState<UmkmInterface | null>(
        null,
    );
    const [selectedPlan, setSelectedPlan] = useState("");
    const [payment, setPayment] = useState<UmkmSubscriptionInterface | null>(
        null,
    );
    const [releaseTarget, setReleaseTarget] =
        useState<UmkmSubscriptionInterface | null>(null);
    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [method, setMethod] = useState("BANK_TRANSFER");
    const [reference, setReference] = useState("");
    const [note, setNote] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const { callApi: loadPlans } = useApiService("loadActiveUmkmPlans");
    const { callApi: loadSubscriptions, loading } = useApiService(
        "loadMyUmkmSubscriptions",
    );
    const { callApi: create, loading: creating } = useApiService(
        "createUmkmSubscription",
    );
    const { callApi: pay, loading: paying } = useApiService(
        "payUmkmSubscription",
    );
    const { callApi: release, loading: releasing } = useApiService(
        "releaseUmkmSubscription",
    );

    const reload = useCallback(() => {
        loadPlans({}, { onSuccess: (response) => setPlans(response.data || []) });
        loadSubscriptions(
            {},
            { onSuccess: (response) => setRows(response.data || []) },
        );
    }, [loadPlans, loadSubscriptions]);
    useEffect(() => {
        reload();
    }, [reload, businesses]);

    const openPayment = (row: UmkmSubscriptionInterface) => {
        setPayment(row);
        setAmount(String(row.price || ""));
        setPaymentDate(new Date().toISOString().slice(0, 10));
        setMethod("BANK_TRANSFER");
        setReference("");
        setNote("");
        setFile(null);
    };
    const submitPayment = async () => {
        if (!payment || !file || !paymentDate)
            return toast.error("Tanggal dan bukti pembayaran wajib diisi");
        if (!allowedTypes.has(file.type))
            return toast.error("Bukti hanya boleh JPEG, PNG, atau PDF");
        if (file.size > MAX_FILE_SIZE)
            return toast.error("Ukuran bukti maksimal 5 MB");
        await pay(
            {
                id: payment.id,
                amount: Number(amount),
                payment_date: paymentDate,
                payment_method: method,
                reference_number: reference,
                note,
                proof_data: await readFile(file),
                proof_original_name: file.name,
                proof_mime_type: file.type,
            },
            {
                onSuccess: () => {
                    toast.success(
                        payment.status === "DRAFT"
                            ? "Bukti tersimpan pada draft"
                            : "Bukti diajukan kembali",
                    );
                    setPayment(null);
                    reload();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    };
    const createRenewal = async () => {
        if (!renewBusiness || !selectedPlan) return;
        await create(
            {
                umkm_id: renewBusiness.id,
                revision_id: renewBusiness.approved_revision_id,
                plan_id: selectedPlan,
            },
            {
                onSuccess: () => {
                    toast.success("Draft perpanjangan dibuat");
                    setRenewBusiness(null);
                    setSelectedPlan("");
                    reload();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    };
    const releaseNow = async () => {
        if (!releaseTarget) return;
        await release(
            { id: releaseTarget.id },
            {
                onSuccess: () => {
                    toast.success("Iklan berhasil dirilis");
                    setReleaseTarget(null);
                    reload();
                },
                onError: (error) => toast.error(error.message),
            },
        );
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Subscription Iklan</CardTitle>
                </CardHeader>
                <CardContent>
                    <AppDataTable
                        data={rows}
                        loading={loading}
                        columns={[
                            { field: "umkm_name", header: "UMKM" },
                            { field: "plan_name", header: "Paket" },
                            {
                                field: "price",
                                header: "Harga",
                                body: (row) => money(row.price),
                            },
                            {
                                field: "duration_days",
                                header: "Durasi",
                                body: (row) => `${row.duration_days} hari`,
                            },
                            {
                                field: "status",
                                header: "Status",
                                body: (row) => (
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                        {statusLabels[row.status || ""] || row.status}
                                    </span>
                                ),
                            },
                            {
                                header: "Aksi",
                                body: (row) => (
                                    <div className="flex gap-1">
                                        {["DRAFT", "PAYMENT_REJECTED"].includes(row.status || "") ||
                                        (row.status === "PENDING_CONTENT_REVIEW" && !row.proof_original_name) ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openPayment(row)}
                                            >
                                                <CreditCard className="h-4 w-4" />
                                                {row.status === "PAYMENT_REJECTED"
                                                    ? "Upload Ulang"
                                                    : row.proof_original_name
                                                      ? "Ganti Bukti"
                                                      : "Bukti Bayar"}
                                            </Button>
                                        ) : null}
                                        {row.status === "READY_TO_RELEASE" ? (
                                            <Button size="sm" onClick={() => setReleaseTarget(row)}>
                                                <Rocket className="h-4 w-4" />
                                                Rilis
                                            </Button>
                                        ) : null}
                                    </div>
                                ),
                            },
                        ]}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                        {businesses
                            .filter(
                                (business) =>
                                    business.approved_revision_id &&
                                    rows.some(
                                        (row) =>
                                            row.umkm_id === business.id && row.status === "ACTIVE",
                                    ) &&
                                    !rows.some(
                                        (row) =>
                                            row.umkm_id === business.id &&
                                            [
                                                "DRAFT",
                                                "PENDING_CONTENT_REVIEW",
                                                "PENDING_PAYMENT_REVIEW",
                                                "READY_TO_RELEASE",
                                            ].includes(row.status || ""),
                                    ),
                            )
                            .map((business) => (
                                <Button
                                    key={business.id}
                                    variant="outline"
                                    onClick={() => setRenewBusiness(business)}
                                >
                                    <PackagePlus className="h-4 w-4" />
                                    Perpanjang {business.name}
                                </Button>
                            ))}
                    </div>
                </CardContent>
            </Card>
            <Dialog
                open={Boolean(renewBusiness)}
                onOpenChange={(open) => !open && setRenewBusiness(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pilih Paket Perpanjangan</DialogTitle>
                        <DialogDescription>
                            Perpanjangan baru dapat dirilis setelah periode aktif selesai.
                        </DialogDescription>
                    </DialogHeader>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih paket" />
                        </SelectTrigger>
                        <SelectContent>
                            {plans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id!}>
                                    {plan.name} - {money(plan.price)} / {plan.duration_days} hari
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewBusiness(null)}>
                            Batal
                        </Button>
                        <Button
                            disabled={creating || !selectedPlan}
                            onClick={createRenewal}
                        >
                            Buat Draft
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(payment)}
                onOpenChange={(open) => !open && setPayment(null)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Upload Bukti Pembayaran</DialogTitle>
                        <DialogDescription>
                            Nominal harus sama dengan harga paket, yaitu{" "}
                            {money(payment?.price)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label>Nominal</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Tanggal Pembayaran</Label>
                            <Input
                                type="date"
                                value={paymentDate}
                                onChange={(event) => setPaymentDate(event.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Metode</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem>
                                <SelectItem value="CASH">Tunai</SelectItem>
                                <SelectItem value="OTHER">Lainnya</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Nomor Referensi</Label>
                        <Input
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Catatan</Label>
                        <Textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                        />
                    </div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-5 text-sm">
                        <Upload className="h-4 w-4" />
                        {file?.name || "Pilih JPEG, PNG, atau PDF"}
                        <Input
                            className="sr-only"
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(event) => setFile(event.target.files?.[0] || null)}
                        />
                    </label>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayment(null)}>
                            Batal
                        </Button>
                        <Button disabled={paying} onClick={submitPayment}>
                            Simpan Bukti
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <SwalDialog
                open={Boolean(releaseTarget)}
                isLoading={releasing}
                title="Rilis Iklan?"
                message="Masa subscription akan dimulai hari ini dan tidak dapat dijeda."
                variant="info"
                confirmText="Rilis"
                cancelText="Kembali"
                onCancel={() => setReleaseTarget(null)}
                onConfirm={releaseNow}
            />
        </>
    );
}
