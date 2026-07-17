"use client";

import { AppDataTable } from "@/components/DataTable";
import { GuestVisitDetailDialog } from "@/components/GuestVisitDetailDialog";
import { GuestVisitStatusBadge } from "@/components/GuestVisitStatusBadge";
import { useApiService } from "@/hooks";
import { formatDateTime } from "@/utils/format-date";
import type { GuestVisitInterface, GuestVisitStatus, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@monorepo/ui/components/select";
import { Eye, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function PageContent() {
  const [data, setData] = useState<GuestVisitInterface[]>([]); const [detail, setDetail] = useState<GuestVisitInterface | null>(null);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [status, setStatus] = useState<GuestVisitStatus | "ALL">("ALL"); const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const { callApi: load, loading } = useApiService("loadGuestHistory");
  const reload = useCallback(() => load({ params: { status: status === "ALL" ? null : status, search: query }, metadata: meta }, { onSuccess: (response) => { setData(response.data || []); setMeta((current) => ({ ...current, total: response.metaData?.total || 0 })); } }), [load, meta.page, meta.pageSize, query, status]);
  useEffect(() => { reload(); }, [reload]);
  return <div className="mt-6 space-y-6"><div className="border-b pb-5"><h1 className="text-2xl font-bold">Riwayat Kunjungan</h1><p className="mt-1 text-sm text-slate-500">Riwayat laporan, kedatangan, dan kepulangan tamu.</p></div>
    <div className="flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 gap-2"><Input value={search} placeholder="Cari tamu, alamat, atau plat" startAdornment={<Search className="h-4 w-4" />} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setQuery(search)} /><Button variant="outline" onClick={() => setQuery(search)}>Cari</Button></div><Select value={status} onValueChange={(value) => setStatus(value as GuestVisitStatus | "ALL")}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Semua Status</SelectItem><SelectItem value="SUBMITTED">Submitted</SelectItem><SelectItem value="CHECKED_IN">Checked In</SelectItem><SelectItem value="CHECKED_OUT">Checked Out</SelectItem><SelectItem value="CANCELED">Canceled</SelectItem></SelectContent></Select></div>
    <Card><CardContent className="pt-6"><AppDataTable data={data} loading={loading} meta={meta} onMetaChange={setMeta} columns={[
      { field: "guest_name", header: "Tamu" }, { field: "family_address", header: "Rumah Tujuan" }, { field: "planned_arrival_time", header: "Rencana", body: (row) => formatDateTime(row.planned_arrival_time) }, { field: "checked_in_time", header: "Masuk", body: (row) => formatDateTime(row.checked_in_time) }, { field: "checked_out_time", header: "Keluar", body: (row) => formatDateTime(row.checked_out_time) }, { field: "status", header: "Status", body: (row) => <GuestVisitStatusBadge status={row.status} /> }, { header: "Aksi", body: (row) => <Button size="icon" variant="ghost" title="Detail" onClick={() => setDetail(row)}><Eye className="h-4 w-4" /></Button> },
    ]} /></CardContent></Card><GuestVisitDetailDialog item={detail} onClose={() => setDetail(null)} />
  </div>;
}
