"use client";

import type { CreateTenantRequest, CreateTenantResponse, Metadata, PlatformPlanInterface, PlatformTenantDetailInterface, PlatformTenantListItem } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Eye, EyeOff, Plus, Power, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { PlatformStatusBadge } from "@/components/PlatformStatusBadge";
import { platformApi } from "@/services/platform-api";

const emptyForm: CreateTenantRequest = { code: "", name: "", plan_id: "", slug: "", address: "", contact_name: "", contact_email: "", contact_phone: "", admin_username: "", admin_email: "", admin_password: "" };
const bytes = (value: number) => `${(value / 1024 ** 3).toFixed(value >= 1024 ** 3 ? 1 : 2)} GB`;
const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function PlatformTenantsPage() {
  const [data, setData] = useState<PlatformTenantListItem[]>([]);
  const [plans, setPlans] = useState<PlatformPlanInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [form, setForm] = useState<CreateTenantRequest>(emptyForm);
  const [detail, setDetail] = useState<PlatformTenantDetailInterface | null>(null);
  const [statusTarget, setStatusTarget] = useState<PlatformTenantListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await platformApi<PlatformTenantListItem[]>("/platform/tenant/load", { params: { keyword }, metadata: meta }); setData(response.data || []); setMeta((current) => ({ ...current, total: response.metaData?.total || 0 })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Tenant gagal dimuat"); }
    finally { setLoading(false); }
  }, [keyword, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    platformApi<PlatformPlanInterface[]>("/platform/subscription/plan")
      .then((response) => {
        const activePlans = (response.data || []).filter((plan) => plan.status === "ACTIVE");
        const defaultPlan = activePlans.find((plan) => plan.code === "FREE") || activePlans[0];
        setPlans(activePlans);
        setForm((current) => current.plan_id ? current : { ...current, plan_id: defaultPlan?.id || "" });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Paket gagal dimuat"));
  }, []);

  const createTenant = async () => {
    setSaving(true);
    try { const response = await platformApi<CreateTenantResponse>("/platform/tenant", form); toast.success(`Tenant ${response.data?.tenant.name || ""} berhasil dibuat`); setFormOpen(false); setForm(emptyForm); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Tenant gagal dibuat"); }
    finally { setSaving(false); }
  };
  const openDetail = async (tenantId: string) => {
    try { const response = await platformApi<PlatformTenantDetailInterface>("/platform/tenant/get", { tenant_id: tenantId }); setDetail(response.data || null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Detail gagal dimuat"); }
  };
  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    const status = statusTarget.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try { await platformApi("/platform/tenant/status", { tenant_id: statusTarget.id, status }); toast.success(`Tenant berhasil di${status === "ACTIVE" ? "aktifkan" : "suspend"}`); setStatusTarget(null); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Status gagal diperbarui"); }
    finally { setSaving(false); }
  };
  const field = (key: keyof CreateTenantRequest, value: string) => setForm((current) => ({
    ...current,
    [key]: value,
    ...(key === "name" ? { slug: slugify(value) } : {}),
  }));
  const openCreateForm = () => {
    const defaultPlan = plans.find((plan) => plan.code === "FREE") || plans[0];
    setForm({ ...emptyForm, plan_id: defaultPlan?.id || "" });
    setPasswordVisible(false);
    setFormOpen(true);
  };

  return <div className="space-y-6"><div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-900">Tenant</h1><p className="mt-1 text-sm text-slate-500">Onboarding dan operasional seluruh perumahan.</p></div><Button onClick={openCreateForm}><Plus className="h-4 w-4" />Tenant Baru</Button></div>
    <Card><CardContent className="pt-6"><form className="mb-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setMeta((value) => ({ ...value, page: 1 })); load(); }}><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Cari nama, kode, atau slug" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></div><Button type="submit" variant="outline">Cari</Button></form><AppDataTable data={data} loading={loading} meta={meta} onMetaChange={setMeta} columns={[{ field: "code", header: "Kode" },{ field: "name", header: "Tenant" },{ field: "plan_name", header: "Paket", body: (row) => row.plan_name || "-" },{ field: "status", header: "Status", body: (row) => <PlatformStatusBadge status={row.status} /> },{ header: "Storage", body: (row) => <span className="whitespace-nowrap">{bytes(row.storage_usage_bytes)} / {bytes(row.storage_limit_bytes)}</span> },{ header: "Aksi", body: (row) => <div className="flex gap-1"><Button size="icon" variant="ghost" title="Detail" onClick={() => openDetail(row.id)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title={row.status === "ACTIVE" ? "Suspend" : "Aktifkan"} onClick={() => setStatusTarget(row)}><Power className={`h-4 w-4 ${row.status === "ACTIVE" ? "text-red-600" : "text-emerald-600"}`} /></Button></div> }]} /></CardContent></Card>
    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Onboarding Tenant</DialogTitle><DialogDescription>Pilih paket awal tenant. Paket berbayar akan menerbitkan invoice bulan berjalan.</DialogDescription></DialogHeader><div className="grid gap-4 py-2 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Nama Tenant</Label><Input id="name" value={form.name || ""} onChange={(event) => field("name", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="code">Kode</Label><Input id="code" value={form.code || ""} onChange={(event) => field("code", event.target.value)} /></div><div className="space-y-2"><Label htmlFor="slug">Slug</Label><Input id="slug" readOnly className="bg-slate-50 text-slate-600" value={form.slug || ""} /></div><div className="space-y-2"><Label htmlFor="plan_id">Paket</Label><select id="plan_id" className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={form.plan_id || ""} onChange={(event) => field("plan_id", event.target.value)}><option value="" disabled>Pilih paket</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.price)} / bulan</option>)}</select></div>{[["contact_name","Nama Kontak"],["contact_email","Email Kontak"],["contact_phone","Nomor Kontak"],["admin_username","Username Admin"],["admin_email","Email Admin"]].map(([key,label]) => <div className="space-y-2" key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={String(form[key as keyof CreateTenantRequest] || "")} onChange={(event) => field(key as keyof CreateTenantRequest, event.target.value)} /></div>)}<div className="space-y-2"><Label htmlFor="admin_password">Password Admin</Label><div className="relative"><Input id="admin_password" className="pr-10" type={passwordVisible ? "text" : "password"} value={form.admin_password || ""} onChange={(event) => field("admin_password", event.target.value)} /><Button type="button" size="icon" variant="ghost" className="absolute right-0 top-0" title={passwordVisible ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="address">Alamat</Label><Textarea id="address" value={form.address || ""} onChange={(event) => field("address", event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button><Button disabled={saving || !form.name || !form.code || !form.slug || !form.plan_id || !form.admin_username || !form.admin_email || !form.admin_password} onClick={createTenant}>{saving ? "Menyimpan..." : "Buat Tenant"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{detail?.tenant.name}</DialogTitle><DialogDescription>{detail?.tenant.code} · {detail?.tenant.slug}</DialogDescription></DialogHeader>{detail ? <div className="space-y-5"><div className="grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Status</p><div className="mt-1"><PlatformStatusBadge status={detail.tenant.status} /></div></div><div><p className="text-xs text-slate-500">Paket</p><p className="mt-1 text-sm font-medium">{detail.tenant.plan_name}</p></div><div><p className="text-xs text-slate-500">Admin</p><p className="mt-1 text-sm font-medium">{detail.admin?.username || "-"}</p><p className="text-xs text-slate-500">{detail.admin?.email}</p></div></div><div><h3 className="mb-3 text-sm font-semibold">Invoice Terakhir</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="pb-2">Nomor</th><th>Periode</th><th>Nilai</th><th>Status</th></tr></thead><tbody>{detail.invoices.map((invoice) => <tr key={invoice.id} className="border-t"><td className="py-3 font-medium">{invoice.invoice_number}</td><td>{invoice.billing_period}</td><td>Rp {invoice.amount.toLocaleString("id-ID")}</td><td><PlatformStatusBadge status={invoice.status} /></td></tr>)}</tbody></table></div></div></div> : null}</DialogContent></Dialog>
    <SwalDialog open={Boolean(statusTarget)} isLoading={saving} variant={statusTarget?.status === "ACTIVE" ? "warning" : "success"} title={statusTarget?.status === "ACTIVE" ? "Suspend tenant?" : "Aktifkan tenant?"} message={statusTarget?.status === "ACTIVE" ? "Seluruh fitur tenant akan diblokir, kecuali billing Admin." : "Tenant hanya dapat aktif bila tidak memiliki invoice overdue."} confirmText={statusTarget?.status === "ACTIVE" ? "Suspend" : "Aktifkan"} onCancel={() => setStatusTarget(null)} onConfirm={changeStatus} />
  </div>;
}
