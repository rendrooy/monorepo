"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { GuestVisitDetailDialog } from "@/components/GuestVisitDetailDialog";
import { GuestVisitFormDialog } from "@/components/GuestVisitFormDialog";
import { GuestVisitStatusBadge } from "@/components/GuestVisitStatusBadge";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { formatDateTime } from "@/utils/format-date";
import { canAccessRoute } from "@/utils/permission";
import type { GuestVisitInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Ban, Eye, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
  const [data, setData] = useState<GuestVisitInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GuestVisitInterface | null>(null);
  const [detail, setDetail] = useState<GuestVisitInterface | null>(null);
  const [cancelTarget, setCancelTarget] = useState<GuestVisitInterface | null>(
    null,
  );
  const authMenu = useMemo(() => getAuthMenu(), []);
  const canAdd = canAccessRoute(authMenu, "operation/guest", "ADD");
  const canEdit = canAccessRoute(authMenu, "operation/guest", "EDIT");
  const canAction = canAccessRoute(authMenu, "operation/guest", "ACTION");
  const { callApi: load, loading } = useApiService("loadMyGuestVisits");
  const { callApi: create, loading: creating } =
    useApiService("createGuestVisit");
  const { callApi: update, loading: updating } =
    useApiService("updateGuestVisit");
  const { callApi: cancel, loading: canceling } =
    useApiService("cancelGuestVisit");
  const reload = useCallback(
    () =>
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
      ),
    [load, meta.page, meta.pageSize, meta.sortBy, meta.sortDir],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const save = async (value: GuestVisitInterface) => {
    const options = {
      onSuccess: () => {
        toast.success(
          value.id ? "Laporan diperbarui" : "Tamu berhasil dilaporkan",
        );
        setFormOpen(false);
        setEditing(null);
        reload();
      },
      onError: (error: { message?: string }) =>
        toast.error(error.message || "Laporan gagal disimpan"),
    };
    if (value.id) await update(value, options);
    else await create(value, options);
  };
  const cancelVisit = async () => {
    if (!cancelTarget) return;
    await cancel(
      { id: cancelTarget.id },
      {
        onSuccess: () => {
          toast.success("Laporan dibatalkan");
          setCancelTarget(null);
          reload();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Tamu</h1>
          <p className="mt-1 text-sm text-slate-500">
            Laporkan tamu agar petugas dapat memverifikasi kedatangannya di
            gerbang.
          </p>
        </div>
        {canAdd ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Laporkan Tamu
          </Button>
        ) : null}
      </div>
      <Card>
        <CardContent className="pt-6">
          <AppDataTable
            data={data}
            loading={loading}
            meta={meta}
            onMetaChange={setMeta}
            columns={[
              { field: "guest_name", header: "Tamu" },
              { field: "visit_purpose", header: "Tujuan" },
              {
                field: "planned_arrival_time",
                header: "Rencana Datang",
                body: (row) => formatDateTime(row.planned_arrival_time),
              },
              {
                field: "status",
                header: "Status",
                body: (row) => <GuestVisitStatusBadge status={row.status} />,
              },
              {
                header: "Aksi",
                body: (row) => (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Detail"
                      onClick={() => setDetail(row)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {row.status === "SUBMITTED" && canEdit ? (
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
                    {row.status === "SUBMITTED" && canAction ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Batalkan"
                        onClick={() => setCancelTarget(row)}
                      >
                        <Ban className="h-4 w-4 text-red-600" />
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
      <GuestVisitFormDialog
        open={formOpen}
        item={editing}
        loading={creating || updating}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={save}
      />
      <GuestVisitDetailDialog item={detail} onClose={() => setDetail(null)} />
      <SwalDialog
        open={Boolean(cancelTarget)}
        isLoading={canceling}
        title="Batalkan Laporan?"
        message="Laporan yang dibatalkan tidak dapat digunakan untuk masuk."
        variant="warning"
        confirmText="Batalkan"
        cancelText="Kembali"
        onCancel={() => setCancelTarget(null)}
        onConfirm={cancelVisit}
      />
    </div>
  );
}
