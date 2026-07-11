import { CheckCircle2, CircleDollarSign, Clock3, MinusCircle, RotateCcw, XCircle } from "lucide-react";

const config = {
  DRAFT: { label: "Draft", className: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock3 },
  PUBLISHED: { label: "Terbit", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  CANCELLED: { label: "Dibatalkan", className: "bg-slate-100 text-slate-600 ring-slate-200", icon: XCircle },
  UNPAID: { label: "Belum Dibayar", className: "bg-rose-50 text-rose-700 ring-rose-200", icon: MinusCircle },
  PARTIALLY_PAID: { label: "Dibayar Sebagian", className: "bg-blue-50 text-blue-700 ring-blue-200", icon: CircleDollarSign },
  PAID: { label: "Lunas", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  OVERPAID: { label: "Lebih Bayar", className: "bg-violet-50 text-violet-700 ring-violet-200", icon: CircleDollarSign },
  PENDING: { label: "Menunggu Verifikasi", className: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock3 },
  APPROVED: { label: "Disetujui", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  REJECTED: { label: "Ditolak", className: "bg-rose-50 text-rose-700 ring-rose-200", icon: XCircle },
  REVERSED: { label: "Direversal", className: "bg-slate-100 text-slate-600 ring-slate-200", icon: RotateCcw },
} as const;

export function IplStatusBadge({ status, className = "" }: Readonly<{ status?: string | null; className?: string }>) {
  const resolved = config[status as keyof typeof config] || { label: status || "-", className: "bg-slate-100 text-slate-600 ring-slate-200", icon: MinusCircle };
  const Icon = resolved.icon;
  return <span className={`inline-flex w-fit items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ${resolved.className} ${className}`}><Icon className="mr-1.5 h-3.5 w-3.5" />{resolved.label}</span>;
}
