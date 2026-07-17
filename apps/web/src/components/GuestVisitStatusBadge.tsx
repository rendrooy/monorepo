import type { GuestVisitStatus } from "@monorepo/types";

const config: Record<GuestVisitStatus, { label: string; className: string }> = {
  SUBMITTED: { label: "Menunggu Kedatangan", className: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  CHECKED_IN: { label: "Sudah Masuk", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  CHECKED_OUT: { label: "Sudah Keluar", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  CANCELED: { label: "Dibatalkan", className: "bg-red-50 text-red-700 ring-red-600/20" },
};

export function GuestVisitStatusBadge({ status }: Readonly<{ status?: GuestVisitStatus | null }>) {
  if (!status) return <span>-</span>;
  const item = config[status];
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.className}`}>{item.label}</span>;
}
