"use client";
import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import type { UmkmSubscriptionPlanInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
const money = (v?: number | null) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(v || 0));
export default function PageContent() {
    const [data, setData] = useState<UmkmSubscriptionPlanInterface[]>([]),
        [edit, setEdit] = useState<
            UmkmSubscriptionPlanInterface | null | undefined
        >(),
        [name, setName] = useState(""),
        [price, setPrice] = useState(""),
        [days, setDays] = useState(""),
        [description, setDescription] = useState("");
    const { callApi: load, loading } = useApiService("loadUmkmPlans"),
        { callApi: save, loading: saving } = useApiService("saveUmkmPlan");
    const reload = useCallback(() => {
        load({}, { onSuccess: (r) => setData(r.data || []) });
    }, [load]);
    useEffect(() => {
        reload();
    }, [reload]);
    const open = (x: UmkmSubscriptionPlanInterface | null) => {
        setEdit(x);
        setName(x?.name || "");
        setPrice(String(x?.price || ""));
        setDays(String(x?.duration_days || ""));
        setDescription(x?.description || "");
    };
    const submit = () =>
        save(
            {
                id: edit?.id,
                name,
                price: Number(price),
                duration_days: Number(days),
                description,
                is_active: edit?.is_active !== false,
            },
            {
                onSuccess: () => {
                    toast.success("Paket disimpan");
                    setEdit(undefined);
                    reload();
                },
                onError: (e) => toast.error(e.message),
            },
        );
    return (
        <div className="mt-6 space-y-6">
            <div className="flex items-end justify-between border-b pb-5">
                <div>
                    <h1 className="text-2xl font-bold">Paket Subscription</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Kelola harga dan durasi iklan UMKM.
                    </p>
                </div>
                <Button onClick={() => open(null)}>
                    <Plus className="h-4 w-4" />
                    Tambah Paket
                </Button>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <AppDataTable
                        data={data}
                        loading={loading}
                        columns={[
                            { field: "name", header: "Nama" },
                            { field: "price", header: "Harga", body: (r) => money(r.price) },
                            {
                                field: "duration_days",
                                header: "Durasi",
                                body: (r) => `${r.duration_days} hari`,
                            },
                            {
                                field: "is_active",
                                header: "Status",
                                body: (r) => (
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                                    >
                                        {r.is_active ? "Aktif" : "Nonaktif"}
                                    </span>
                                ),
                            },
                            {
                                header: "Aksi",
                                body: (r) => (
                                    <Button size="icon" variant="ghost" onClick={() => open(r)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </CardContent>
            </Card>
            <Dialog
                open={edit !== undefined}
                onOpenChange={(o) => !o && setEdit(undefined)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{edit?.id ? "Edit" : "Tambah"} Paket</DialogTitle>
                    </DialogHeader>
                    <div>
                        <Label>Nama</Label>
                        <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Harga</Label>
                            <Input
                                className="mt-2"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Durasi (hari)</Label>
                            <Input
                                className="mt-2"
                                type="number"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Deskripsi</Label>
                        <Textarea
                            className="mt-2"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEdit(undefined)}>
                            Batal
                        </Button>
                        <Button
                            disabled={saving || !name || !price || !days}
                            onClick={submit}
                        >
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
