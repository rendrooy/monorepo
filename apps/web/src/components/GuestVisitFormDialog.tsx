"use client";

import type {
  GuestVehicleInterface,
  GuestVehicleType,
  GuestVisitInterface,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
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
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type VehicleDraft = GuestVehicleInterface & { key: string };
const emptyVehicle = (): VehicleDraft => ({
  key: crypto.randomUUID(),
  plate_number: "",
  vehicle_type: "CAR",
  vehicle_brand: "",
  vehicle_color: "",
});
const toInputDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function GuestVisitFormDialog({
  open,
  item,
  loading,
  onOpenChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  item: GuestVisitInterface | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: GuestVisitInterface) => void;
}>) {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [vehicles, setVehicles] = useState<VehicleDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setGuestName(item?.guest_name || "");
    setGuestPhone(item?.guest_phone || "");
    setPurpose(item?.visit_purpose || "");
    setArrival(toInputDate(item?.planned_arrival_time));
    setDeparture(toInputDate(item?.planned_departure_time));
    setVehicles(
      (item?.vehicles || []).map((vehicle) => ({
        ...vehicle,
        key: vehicle.id || crypto.randomUUID(),
      })),
    );
  }, [item, open]);

  const valid =
    guestName.trim() &&
    purpose.trim() &&
    arrival &&
    vehicles.every((vehicle) => vehicle.plate_number?.trim());
  const updateVehicle = (
    key: string,
    field: keyof GuestVehicleInterface,
    value: string,
  ) =>
    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.key === key ? { ...vehicle, [field]: value } : vehicle,
      ),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Ubah Laporan Tamu" : "Laporkan Tamu"}
          </DialogTitle>
          <DialogDescription>

            Informasi ini digunakan petugas untuk mencocokkan tamu saat datang
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="guest-name">Nama Tamu</Label>
            <Input
              className="mt-3"
              id="guest-name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="guest-phone">Nomor Telepon (opsional)</Label>
            <Input
              className="mt-3"
              id="guest-phone"
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="arrival">Rencana Kedatangan</Label>
            <Input
              className="mt-3"
              id="arrival"
              type="datetime-local"
              value={arrival}
              onChange={(event) => setArrival(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="departure">Rencana Selesai (opsional)</Label>
            <Input
              className="mt-3"
              id="departure"
              type="datetime-local"
              min={arrival}
              value={departure}
              onChange={(event) => setDeparture(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="purpose">Tujuan Kunjungan</Label>
            <Textarea
              className="mt-3"
              id="purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            />
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Kendaraan</h3>
              <p className="text-xs text-slate-500">
                Kosongkan jika tamu datang tanpa kendaraan.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setVehicles((current) => [...current, emptyVehicle()])
              }
            >
              <Plus className="h-4 w-4" />
              Kendaraan
            </Button>
          </div>
          <div className="space-y-3">
            {vehicles.map((vehicle, index) => (
              <div
                key={vehicle.key}
                className="grid gap-3 rounded-md border p-3 sm:grid-cols-[1.1fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <Label>Plat Nomor</Label>
                  <Input
                    className="mt-3"
                    value={vehicle.plate_number || ""}
                    onChange={(event) =>
                      updateVehicle(
                        vehicle.key,
                        "plate_number",
                        event.target.value.toUpperCase(),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Jenis</Label>
                  <div className="mt-3">
                    <Select
                      value={vehicle.vehicle_type || "CAR"}
                      onValueChange={(value) =>
                        updateVehicle(
                          vehicle.key,
                          "vehicle_type",
                          value as GuestVehicleType,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAR">Mobil</SelectItem>
                        <SelectItem value="MOTORCYCLE">Motor</SelectItem>
                        <SelectItem value="OTHER">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Merek</Label>
                  <Input
                    className="mt-3"
                    value={vehicle.vehicle_brand || ""}
                    onChange={(event) =>
                      updateVehicle(
                        vehicle.key,
                        "vehicle_brand",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Warna</Label>
                  <Input
                    className="mt-3"
                    value={vehicle.vehicle_color || ""}
                    onChange={(event) =>
                      updateVehicle(
                        vehicle.key,
                        "vehicle_color",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="mt-5"
                  title={`Hapus kendaraan ${index + 1}`}
                  onClick={() =>
                    setVehicles((current) =>
                      current.filter((row) => row.key !== vehicle.key),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!valid || loading}
            onClick={() =>
              onSubmit({
                id: item?.id,
                guest_name: guestName,
                guest_phone: guestPhone,
                visit_purpose: purpose,
                planned_arrival_time: new Date(arrival).toISOString(),
                planned_departure_time: departure
                  ? new Date(departure).toISOString()
                  : null,
                vehicles,
              })
            }
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
