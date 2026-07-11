"use client";

import { AppDataTable } from "@/components/DataTable";
import SwalDialog from "@/components/ConfirmationDialog";
import { FilterPanel } from "@/components/FilterPanel";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type { IplBillBatchInterface, IplBillInterface, Metadata } from "@monorepo/types";
import { Badge } from "@monorepo/ui/components/badge";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import MonthYearPicker, { type YearMonth } from "@monorepo/ui/components/monthyear";
import { Popover, PopoverContent, PopoverTrigger } from "@monorepo/ui/components/popover";
import { Textarea } from "@monorepo/ui/components/textarea";
import { Ban, CalendarDays, ChevronDown, FilePlus2, Pencil, Rocket, ScrollText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const money = (value?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
const badgeClass: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700", PUBLISHED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-600", UNPAID: "bg-red-50 text-red-700",
};
const monthCodes = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
const toPeriod = ({ month, year }: YearMonth) => `${monthCodes[month - 1] || "JAN"}-${year}`;
const fromPeriod = (period: string): YearMonth => {
  const [monthCode, yearText] = period.split("-");
  const monthIndex = monthCodes.indexOf(monthCode || "");
  return {
    month: monthIndex >= 0 ? monthIndex + 1 : new Date().getMonth() + 1,
    year: Number(yearText) || new Date().getFullYear(),
  };
};

export default function PageContent() {
  const authMenu = useMemo(() => getAuthMenu(), []);
  const canAdd = useMemo(() => canAccessRoute(authMenu, "operation/ipl", "ADD"), [authMenu]);
  const canEdit = useMemo(() => canAccessRoute(authMenu, "operation/ipl", "EDIT"), [authMenu]);
  const canAction = useMemo(() => canAccessRoute(authMenu, "operation/ipl", "ACTION"), [authMenu]);
  const [view, setView] = useState<"batch" | "bill">("batch");
  const [batches, setBatches] = useState<IplBillBatchInterface[]>([]);
  const [bills, setBills] = useState<IplBillInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [filter, setFilter] = useState({ period: "", status: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ type: "PUBLISH" | "CANCEL"; batch: IplBillBatchInterface } | null>(null);
  const [editing, setEditing] = useState<IplBillBatchInterface | null>(null);
  const [form, setForm] = useState({ period: "", amount: "", note: "" });
  const { callApi: loadBatch, loading: loadingBatch } = useApiService("loadIplBatch");
  const { callApi: loadBill, loading: loadingBill } = useApiService("loadIplBill");
  const { callApi: createBatch, loading: creating } = useApiService("insertIplBatch");
  const { callApi: updateBatch, loading: updating } = useApiService("updateIplBatch");
  const { callApi: publishBatch, loading: publishing } = useApiService("publishIplBatch");
  const { callApi: cancelBatch, loading: cancelling } = useApiService("cancelIplBatch");

  const reload = useCallback(() => {
    if (view === "batch") {
      loadBatch({ params: { period: filter.period || undefined, status: (filter.status || undefined) as IplBillBatchInterface["status"] }, metadata: meta }, {
        onSuccess: (response) => { setBatches(response.data || []); setMeta((old) => ({ ...old, total: response.metaData?.total || 0 })); },
      });
    } else {
      loadBill({ params: { period: filter.period || undefined, status: (filter.status || undefined) as IplBillInterface["status"] }, metadata: meta }, {
        onSuccess: (response) => { setBills(response.data || []); setMeta((old) => ({ ...old, total: response.metaData?.total || 0 })); },
      });
    }
  }, [filter.period, filter.status, loadBatch, loadBill, meta.page, meta.pageSize, meta.sortBy, meta.sortDir, view]);

  useEffect(() => { reload(); }, [reload]);

  const openForm = (batch?: IplBillBatchInterface) => {
    const currentPeriod = toPeriod({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    setEditing(batch || null);
    setForm({ period: batch?.period || currentPeriod, amount: batch?.amount ? String(batch.amount) : "", note: batch?.note || "" });
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = { id: editing?.id, period: form.period.toUpperCase(), amount: Number(form.amount), note: form.note };
    const call = editing ? updateBatch : createBatch;
    await call(payload, {
      onSuccess: () => { toast.success(editing ? "Draft diperbarui" : "Draft dibuat"); setDialogOpen(false); reload(); },
      onError: (error) => toast.error(error.message || "Data gagal disimpan"),
    });
  };

  const publish = async (batch: IplBillBatchInterface) => {
    await publishBatch({ id: batch.id }, {
      onSuccess: (response) => { toast.success(`${response.data?.generated || 0} tagihan dibuat, ${response.data?.skipped || 0} dilewati`); setConfirmation(null); reload(); },
      onError: (error) => toast.error(error.message || "Gagal menerbitkan tagihan"),
    });
  };

  const cancel = async (batch: IplBillBatchInterface) => {
    await cancelBatch({ id: batch.id }, { onSuccess: () => { toast.success("Batch dibatalkan"); setConfirmation(null); reload(); }, onError: (error) => toast.error(error.message) });
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">IPL Billing</h1><p className="mt-1 text-sm text-slate-500">Terbitkan dan pantau tagihan IPL keluarga berdomisili aktif.</p></div>
        {canAdd && view === "batch" ? <Button onClick={() => openForm()}><FilePlus2 className="h-4 w-4" /> Buat Draft</Button> : null}
      </div>

      <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
        <Button size="sm" variant={view === "batch" ? "default" : "ghost"} onClick={() => { setView("batch"); setMeta({ page: 1, pageSize: 10, total: 0 }); }}>Batch Generate</Button>
        <Button size="sm" variant={view === "bill" ? "default" : "ghost"} onClick={() => { setView("bill"); setMeta({ page: 1, pageSize: 10, total: 0 }); }}>Tagihan Keluarga</Button>
      </div>

      <FilterPanel columns={2} onSubmit={() => setMeta((old) => ({ ...old, page: 1 }))} onReset={() => setFilter({ period: "", status: "" })}>
        <div><Label>Periode</Label><Input className="mt-2" placeholder="Contoh: JUL-2026" value={filter.period} onChange={(e) => setFilter((old) => ({ ...old, period: e.target.value.toUpperCase() }))} /></div>
        <div><Label>Status</Label><Input className="mt-2" placeholder={view === "batch" ? "DRAFT / PUBLISHED" : "UNPAID"} value={filter.status} onChange={(e) => setFilter((old) => ({ ...old, status: e.target.value.toUpperCase() }))} /></div>
      </FilterPanel>

      <Card><CardContent className="pt-6">
        {view === "batch" ? <AppDataTable
          data={batches} loading={loadingBatch} meta={meta} onMetaChange={setMeta}
          columns={[
            { field: "period", header: "Periode", sortable: true },
            { field: "amount", header: "Nominal", body: (row) => money(row.amount) },
            { field: "generated_bill_count", header: "Tagihan Dibuat" },
            { field: "status", header: "Status", body: (row) => <Badge className={badgeClass[row.status || ""]}>{row.status}</Badge> },
            { header: "Aksi", body: (row) => <div className="flex gap-1">
              {canEdit && row.status !== "CANCELLED" ? <Button size="icon" variant="ghost" title="Edit" onClick={() => openForm(row)}><Pencil className="h-4 w-4" /></Button> : null}
              {canAction && row.status === "DRAFT" ? <Button size="icon" variant="ghost" title="Publish" disabled={publishing} onClick={() => setConfirmation({ type: "PUBLISH", batch: row })}><Rocket className="h-4 w-4" /></Button> : null}
              {canAction && row.status !== "CANCELLED" ? <Button size="icon" variant="ghost" title="Batalkan" disabled={cancelling} onClick={() => setConfirmation({ type: "CANCEL", batch: row })}><Ban className="h-4 w-4 text-red-600" /></Button> : null}
            </div> },
          ]}
        /> : <AppDataTable
          data={bills} loading={loadingBill} meta={meta} onMetaChange={setMeta}
          columns={[
            { field: "bill_number", header: "Nomor Tagihan", sortable: true },
            { field: "period", header: "Periode", sortable: true },
            { field: "family_no_kk", header: "No. KK" },
            { field: "family_address", header: "Alamat" },
            { field: "amount", header: "Nominal", body: (row) => money(row.amount) },
            { field: "status", header: "Status", body: (row) => <Badge className={badgeClass[row.status || ""]}>{row.status}</Badge> },
          ]}
        />}
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Batch Tagihan" : "Buat Draft Tagihan"}</DialogTitle><DialogDescription>Tagihan individual baru dibuat saat draft diterbitkan.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Periode</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 w-full justify-between font-normal"
                  disabled={editing?.status !== undefined && editing.status !== "DRAFT"}
                >
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-500" />{form.period}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <MonthYearPicker
                  className="w-64 shadow-none"
                  value={fromPeriod(form.period)}
                  onChange={(value) => setForm((old) => ({ ...old, period: toPeriod(value) }))}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div><Label htmlFor="amount">Nominal</Label><Input id="amount" className="mt-2" type="number" min="1" disabled={editing?.status !== undefined && editing.status !== "DRAFT"} value={form.amount} onChange={(e) => setForm((old) => ({ ...old, amount: e.target.value }))} /></div>
          <div><Label htmlFor="note">Catatan</Label><Textarea id="note" className="mt-2" value={form.note} onChange={(e) => setForm((old) => ({ ...old, note: e.target.value }))} /></div>
          {editing?.eligible_family_count ? <p className="flex items-center gap-2 text-sm text-slate-500"><ScrollText className="h-4 w-4" /> {editing.eligible_family_count} keluarga memenuhi kriteria.</p> : null}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button disabled={creating || updating || !form.period || !form.amount} onClick={save}>Simpan Draft</Button></DialogFooter>
      </DialogContent></Dialog>
      <SwalDialog
        open={confirmation !== null}
        isLoading={publishing || cancelling}
        title={confirmation?.type === "PUBLISH" ? "Terbitkan Tagihan?" : "Batalkan Batch Tagihan?"}
        message={confirmation?.type === "PUBLISH"
          ? `Tagihan ${confirmation.batch.period} akan dibuat untuk seluruh keluarga yang memenuhi kriteria.`
          : `Batch ${confirmation?.batch.period || ""} dan tagihan aktif di dalamnya akan dibatalkan.`}
        variant={confirmation?.type === "PUBLISH" ? "info" : "warning"}
        confirmText={confirmation?.type === "PUBLISH" ? "Terbitkan" : "Batalkan Batch"}
        cancelText="Kembali"
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation && (confirmation.type === "PUBLISH" ? publish(confirmation.batch) : cancel(confirmation.batch))}
      />
    </div>
  );
}
