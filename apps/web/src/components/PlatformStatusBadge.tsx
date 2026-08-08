import { Badge } from "@monorepo/ui/components/badge";

const styles: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  SUCCEEDED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  ISSUED: "border-blue-200 bg-blue-50 text-blue-700",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-600",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  RUNNING: "border-blue-200 bg-blue-50 text-blue-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
  SUSPENDED: "border-red-200 bg-red-50 text-red-700",
};

export function PlatformStatusBadge({ status }: Readonly<{ status?: null | string }>) {
  const value = status || "-";
  return <Badge variant="outline" className={styles[value] || styles.INACTIVE}>{value.replaceAll("_", " ")}</Badge>;
}
