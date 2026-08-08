"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { GuestVisitDetailDialog } from "@/components/GuestVisitDetailDialog";
import { GuestVisitStatusBadge } from "@/components/GuestVisitStatusBadge";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { formatDateTime } from "@/utils/format-date";
import { canAccessRoute } from "@/utils/permission";
import type {
  GuestVisitInterface,
  GuestVisitStatus,
  Metadata,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@monorepo/ui/components/select";
import { DoorOpen, Eye, LogOut, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
  const [data, setData] = useState<GuestVisitInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const [status, setStatus] = useState<GuestVisitStatus>("SUBMITTED");
  const [appliedStatus, setAppliedStatus] =
    useState<GuestVisitStatus>("SUBMITTED");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<GuestVisitInterface | null>(null);
  const [actionTarget, setActionTarget] = useState<GuestVisitInterface | null>(
    null,
  );
  const canAction = useMemo(
    () => canAccessRoute(getAuthMenu(), "security/guest-gate", "ACTION"),
    [],
  );
  const { callApi: load, loading } = useApiService("loadGuestGate");
  const { callApi: checkIn, loading: checkingIn } =
    useApiService("checkInGuest");
  const { callApi: checkOut, loading: checkingOut } =
    useApiService("checkOutGuest");
  const reload = useCallback(
    () =>
      load(
        { params: { status: appliedStatus, search: query }, metadata: meta },
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
    [appliedStatus, load, meta.page, meta.pageSize, query],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  const process = async () => {
    if (!actionTarget) return;
    const isIn = actionTarget.status === "SUBMITTED";
    const call = isIn ? checkIn : checkOut;
    await call(
      { id: actionTarget.id },
      {
        onSuccess: () => {
          toast.success(isIn ? "Tamu berhasil masuk" : "Tamu berhasil keluar");
          setActionTarget(null);
          setDetail(null);
          reload();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="border-b pb-5">
        <h1 className="text-2xl font-bold">Gerbang Tamu</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cocokkan tamu dan kendaraan sebelum memberikan akses masuk.
        </p>
      </div>
      <FilterPanel
        title="Filter Tamu"
        columns={2}
        submitLabel="Terapkan"
        onSubmit={() => {
          setQuery(search.trim());
          setAppliedStatus(status);
          setMeta((current) => ({ ...current, page: 1 }));
        }}
        onReset={() => {
          setSearch("");
          setQuery("");
          setStatus("SUBMITTED");
          setAppliedStatus("SUBMITTED");
          setMeta((current) => ({ ...current, page: 1 }));
        }}
      >
        <div>
          <Label htmlFor="guest-gate-search">Pencarian</Label>
          <Input
            id="guest-gate-search"
            className="mt-2"
            value={search}
            placeholder="Cari nama, alamat, no. KK, atau plat"
            startAdornment={<Search className="h-4 w-4" />}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="guest-gate-status">Status Kunjungan</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as GuestVisitStatus)}
          >
            <SelectTrigger id="guest-gate-status" className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUBMITTED">Menunggu Kedatangan</SelectItem>
              <SelectItem value="CHECKED_IN">Sedang Berkunjung</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>
      <Card>
        <CardContent className="pt-6">
          <AppDataTable
            data={data}
            loading={loading}
            meta={meta}
            onMetaChange={setMeta}
            columns={[
              { field: "guest_name", header: "Tamu" },
              { field: "family_address", header: "Rumah Tujuan" },
              {
                field: "planned_arrival_time",
                header: "Rencana",
                body: (row) => formatDateTime(row.planned_arrival_time),
              },
              {
                header: "Kendaraan",
                body: (row) =>
                  row.vehicles
                    ?.map((vehicle) => vehicle.plate_number)
                    .join(", ") || "Tanpa kendaraan",
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
                    {canAction ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={
                          row.status === "SUBMITTED"
                            ? "Izinkan masuk"
                            : "Catat keluar"
                        }
                        onClick={() => setActionTarget(row)}
                      >
                        {row.status === "SUBMITTED" ? (
                          <DoorOpen className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <LogOut className="h-4 w-4 text-blue-600" />
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
      <GuestVisitDetailDialog item={detail} onClose={() => setDetail(null)} />
      <SwalDialog
        open={Boolean(actionTarget)}
        isLoading={checkingIn || checkingOut}
        title={
          actionTarget?.status === "SUBMITTED"
            ? "Izinkan Tamu Masuk?"
            : "Catat Tamu Keluar?"
        }
        message={
          actionTarget?.status === "SUBMITTED"
            ? "Pastikan identitas dan kendaraan sesuai dengan laporan warga."
            : "Pastikan tamu telah meninggalkan area perumahan."
        }
        variant="info"
        confirmText={
          actionTarget?.status === "SUBMITTED" ? "Check-in" : "Check-out"
        }
        cancelText="Kembali"
        onCancel={() => setActionTarget(null)}
        onConfirm={process}
      />
    </div>
  );
}
