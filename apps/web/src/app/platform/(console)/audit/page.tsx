"use client";

import type { Metadata, PlatformAuditLogInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppDataTable } from "@/components/DataTable";
import { platformApi } from "@/services/platform-api";

const dateTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));

export default function PlatformAuditPage() {
  const [data, setData] = useState<PlatformAuditLogInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await platformApi<PlatformAuditLogInterface[]>("/platform/audit/load", { params: { action }, metadata: meta }); setData(response.data || []); setMeta((value) => ({ ...value, total: response.metaData?.total || 0 })); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Audit gagal dimuat"); }
    finally { setLoading(false); }
  }, [action, meta.page, meta.pageSize]);
  useEffect(() => { load(); }, [load]);
  return <div className="space-y-6"><div className="border-b border-slate-200 pb-5"><h1 className="text-2xl font-semibold text-slate-900">Audit Platform</h1><p className="mt-1 text-sm text-slate-500">Jejak tindakan sensitif platform dan tenant.</p></div><Card><CardContent className="pt-6"><form className="mb-5 flex max-w-lg gap-3" onSubmit={(event) => { event.preventDefault(); setMeta((value) => ({ ...value, page: 1 })); load(); }}><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Cari action" value={action} onChange={(event) => setAction(event.target.value)} /></div><Button variant="outline">Cari</Button></form><AppDataTable data={data} loading={loading} meta={meta} onMetaChange={setMeta} columns={[{ field: "created_time", header: "Waktu", body: (row) => dateTime(row.created_time) },{ field: "actor_type", header: "Aktor" },{ field: "tenant_name", header: "Tenant", body: (row) => row.tenant_name || "Platform" },{ field: "action", header: "Action", body: (row) => <code className="text-xs">{row.action}</code> },{ field: "entity_type", header: "Entity", body: (row) => row.entity_type || "-" }]} /></CardContent></Card></div>;
}
