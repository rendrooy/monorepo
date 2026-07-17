import type { GuestVisitInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { CarFront } from "lucide-react";
import { formatDateTime } from "@/utils/format-date";
import { GuestVisitStatusBadge } from "./GuestVisitStatusBadge";

const vehicleType = { CAR: "Mobil", MOTORCYCLE: "Motor", OTHER: "Lainnya" } as const;

export function GuestVisitDetailDialog({ item, onClose }: Readonly<{ item: GuestVisitInterface | null; onClose: () => void }>) {
  return <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Detail Kunjungan</DialogTitle></DialogHeader>{item ? <div className="space-y-5 text-sm">
    <div className="grid gap-4 sm:grid-cols-2"><div><span className="text-slate-500">Nama Tamu</span><div className="font-medium">{item.guest_name}</div></div><div><span className="text-slate-500">Status</span><div className="mt-1"><GuestVisitStatusBadge status={item.status} /></div></div><div><span className="text-slate-500">Rumah Tujuan</span><div className="font-medium">{item.family_address || item.family_no_kk || "-"}</div></div><div><span className="text-slate-500">Telepon</span><div className="font-medium">{item.guest_phone || "-"}</div></div><div><span className="text-slate-500">Rencana Datang</span><div className="font-medium">{formatDateTime(item.planned_arrival_time)}</div></div><div><span className="text-slate-500">Rencana Selesai</span><div className="font-medium">{formatDateTime(item.planned_departure_time)}</div></div><div className="sm:col-span-2"><span className="text-slate-500">Tujuan Kunjungan</span><div className="font-medium">{item.visit_purpose}</div></div></div>
    <div className="border-t pt-4"><h3 className="mb-2 font-semibold">Kendaraan</h3>{item.vehicles?.length ? <div className="space-y-2">{item.vehicles.map((vehicle) => <div key={vehicle.id || vehicle.plate_number} className="flex items-center gap-3 rounded-md border p-3"><CarFront className="h-5 w-5 text-slate-500" /><div><div className="font-semibold">{vehicle.plate_number}</div><div className="text-xs text-slate-500">{vehicleType[vehicle.vehicle_type || "OTHER"]} · {[vehicle.vehicle_brand, vehicle.vehicle_color].filter(Boolean).join(" · ") || "Tanpa detail"}</div></div></div>)}</div> : <p className="text-slate-500">Tamu datang tanpa kendaraan.</p>}</div>
  </div> : null}<DialogFooter><Button variant="outline" onClick={onClose}>Tutup</Button></DialogFooter></DialogContent></Dialog>;
}
