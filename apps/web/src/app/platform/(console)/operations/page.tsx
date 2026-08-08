"use client";

import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import {
  Activity,
  Building2,
  CreditCard,
  HardDrive,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PlatformStatusBadge } from "@/components/PlatformStatusBadge";
import { platformApi } from "@/services/platform-api";

interface JobRow {
  attempt_count: number;
  finished_time?: null | string;
  job_code: string;
  last_error?: null | string;
  scheduled_for: string;
  status: string;
}
interface OperationsSummary {
  invoices_overdue: number;
  jobs: JobRow[];
  payments_pending: number;
  storage_bytes: number;
  tenants_active: number;
  tenants_suspended: number;
}
const dateTime = (value?: null | string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
    : "-";

export default function PlatformOperationsPage() {
  const [data, setData] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await platformApi<OperationsSummary>(
        "/platform/operations/summary",
      );
      setData(response.data || null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Status operasional gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const metrics = [
    {
      icon: Building2,
      label: "Tenant Aktif",
      value: data?.tenants_active || 0,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      icon: TriangleAlert,
      label: "Tenant Suspended",
      value: data?.tenants_suspended || 0,
      tone: "text-red-700 bg-red-50",
    },
    {
      icon: CreditCard,
      label: "Payment Pending",
      value: data?.payments_pending || 0,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      icon: Activity,
      label: "Invoice Overdue",
      value: data?.invoices_overdue || 0,
      tone: "text-red-700 bg-red-50",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold">Operasional</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kesehatan subscription dan histori scheduler platform.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`rounded-md p-2 ${metric.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{metric.label}</p>
                  <p className="text-2xl font-semibold">{metric.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Job Terakhir</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <HardDrive className="h-4 w-4" />
              {((data?.storage_bytes || 0) / 1024 ** 3).toFixed(2)} GB digunakan
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-3">Job</th>
                  <th>Jadwal</th>
                  <th>Percobaan</th>
                  <th>Selesai</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.jobs.length ? (
                  data.jobs.map((job) => (
                    <tr
                      className="border-t"
                      key={`${job.job_code}-${job.scheduled_for}`}
                    >
                      <td className="py-3 font-medium">{job.job_code}</td>
                      <td>{job.scheduled_for}</td>
                      <td>{job.attempt_count}</td>
                      <td>{dateTime(job.finished_time)}</td>
                      <td>
                        <PlatformStatusBadge status={job.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Belum ada job yang dijalankan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
