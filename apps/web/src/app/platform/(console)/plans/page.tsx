"use client";

import type { Metadata, PlatformPlanInterface, UpdatePlatformPlanRequest } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Check, Database, HardDrive, Pencil, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppDataTable } from "@/components/DataTable";
import { PlatformStatusBadge } from "@/components/PlatformStatusBadge";
import { platformApi } from "@/services/platform-api";

interface SubscriptionRow { id: string; tenant_code: string; tenant_name: string; plan_name: string; next_plan_name?: null | string; change_requested_by?: null | string; }
const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<PlatformPlanInterface[]>([]);
  const [requests, setRequests] = useState<SubscriptionRow[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [editing, setEditing] = useState<PlatformPlanInterface | null>(null);
  const [form, setForm] = useState<UpdatePlatformPlanRequest>({ price: 0, status: "INACTIVE" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planResponse, requestResponse] = await Promise.all([
        platformApi<PlatformPlanInterface[]>("/platform/subscription/plan"),
        platformApi<SubscriptionRow[]>("/platform/subscription/load", { params: { pending_change_only: true }, metadata: meta }),
      ]);
      setPlans(planResponse.data || []); setRequests(requestResponse.data || []); setMeta((current) => ({ ...current, total: requestResponse.metaData?.total || 0 }));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Paket gagal dimuat"); }
    finally { setLoading(false); }
  }, [meta.page, meta.pageSize]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    try { await platformApi("/platform/subscription/plan/update", { ...form, plan_id: editing.id }); toast.success("Paket berhasil diperbarui"); setEditing(null); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Paket gagal diperbarui"); }
    finally { setLoading(false); }
  };
  const approve = async (id: string) => {
    try { await platformApi("/platform/subscription/change/approve", { subscription_id: id }); toast.success("Perubahan paket dijadwalkan"); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Pengajuan gagal disetujui"); }
  };

  return <div className="space-y-8"><div className="border-b border-slate-200 pb-5"><h1 className="text-2xl font-semibold text-slate-900">Paket Subscription</h1><p className="mt-1 text-sm text-slate-500">Atur harga paket dan setujui perubahan paket tenant.</p></div><div className="grid gap-4 lg:grid-cols-3">{plans.map((plan) => { const storage = plan.entitlements?.find((item) => item.feature_code === "STORAGE_LIMIT_BYTES"); const features = plan.entitlements?.filter((item) => item.value_type === "BOOLEAN" && item.enabled) || []; return <Card key={plan.id} className="border-slate-200"><CardContent className="pt-6"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">{plan.name}</h2><PlatformStatusBadge status={plan.status} /></div><p className="mt-2 text-2xl font-semibold">{money(plan.price)}<span className="text-sm font-normal text-slate-500"> / bulan</span></p></div><Button size="icon" variant="ghost" title="Edit paket" onClick={() => { setEditing(plan); setForm({ name: plan.name, price: plan.price, status: plan.status }); }}><Pencil className="h-4 w-4" /></Button></div><div className="mt-6 space-y-3 border-t border-slate-200 pt-5"><div className="flex items-center gap-2 text-sm"><HardDrive className="h-4 w-4 text-slate-400" />{storage ? `${Number(storage.limit_value) / 1024 ** 3} GB storage` : "-"}</div>{features.map((feature) => <div className="flex items-center gap-2 text-sm" key={feature.feature_code}><Check className="h-4 w-4 text-emerald-600" />{feature.feature_name}</div>)}</div></CardContent></Card>; })}</div>
    <section><div className="mb-4"><h2 className="text-lg font-semibold">Pengajuan Perubahan Paket</h2><p className="text-sm text-slate-500">Perubahan yang disetujui berlaku pada periode berikutnya.</p></div><Card><CardContent className="pt-6"><AppDataTable data={requests} loading={loading} meta={meta} onMetaChange={setMeta} columns={[{ field: "tenant_code", header: "Kode" },{ field: "tenant_name", header: "Tenant" },{ field: "plan_name", header: "Paket Saat Ini" },{ field: "next_plan_name", header: "Paket Tujuan", body: (row) => row.next_plan_name || "-" },{ field: "change_requested_by", header: "Diajukan Oleh", body: (row) => row.change_requested_by || "-" },{ header: "Aksi", body: (row) => <Button size="sm" onClick={() => approve(row.id)}>Setujui</Button> }]} /></CardContent></Card></section>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Konfigurasi {editing?.code}</DialogTitle><DialogDescription>Harga invoice baru mengikuti konfigurasi ini. Invoice lama tidak berubah.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Nama Paket</Label><Input value={form.name || ""} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></div><div className="space-y-2"><Label>Harga Bulanan</Label><Input type="number" min={0} disabled={editing?.code === "FREE"} value={form.price || 0} onChange={(event) => setForm((value) => ({ ...value, price: Number(event.target.value) }))} /></div><div className="space-y-2"><Label>Status</Label><select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50" disabled={editing?.code === "FREE"} value={form.status || "INACTIVE"} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as "ACTIVE" | "INACTIVE" }))}><option value="ACTIVE">Aktif</option><option value="INACTIVE">Nonaktif</option></select></div></div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button onClick={save} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
