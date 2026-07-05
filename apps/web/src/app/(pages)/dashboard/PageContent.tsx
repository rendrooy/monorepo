"use client";

import { useApiService } from "@/hooks";
import { formatCurrency } from "@/lib/homehub-format";
import { getAuthUser } from "@/utils/auth-storage";
import type { AuthUserInterface, ResidentDashboardInterface } from "@monorepo/types";
import { Badge } from "@monorepo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { AlertCircle, CheckCircle2, CreditCard, Home, PackageOpen, ReceiptText, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

function AdminDashboard() {
  return (
    <div className="mt-6">
      <Card>
        <CardContent>
          <h1 className="my-4 text-2xl font-bold">HomeHub</h1>
          <p className="text-gray-600">
            Selamat datang di dashboard Anda. Di sini Anda dapat melihat ringkasan aktivitas terbaru,
            mengelola pengaturan akun, dan mengakses fitur-fitur lainnya.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="h-28 animate-pulse rounded-md bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function ResidentDashboard({
  data,
  loading,
}: {
  data: ResidentDashboardInterface | null;
  loading: boolean;
}) {
  if (loading) {
    return <DashboardSkeleton />;
  }

  const hasFamily = Boolean(data?.family_id);
  const latestPayment = data?.latest_payment;
  const summaryCards = [
    {
      label: "Total Tagihan IPL",
      value: formatCurrency(data?.total_bill),
      icon: ReceiptText,
    },
    {
      label: "Belum Dibayar",
      value: formatCurrency(data?.total_outstanding),
      icon: AlertCircle,
    },
    {
      label: "Jumlah Tagihan Aktif",
      value: data?.unpaid_count ?? 0,
      icon: CreditCard,
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Dashboard Warga</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Ringkasan akun, keluarga, dan tagihan IPL Anda.
              </p>
            </div>
            <Badge className="w-fit bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {data?.account_status ?? "APPROVED"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex gap-3 rounded-md border border-slate-200 p-4">
            <UserRound className="mt-1 h-5 w-5 text-slate-500" />
            <div>
              <div className="text-sm text-slate-500">Data Warga</div>
              <div className="mt-1 font-semibold">{data?.member_name ?? "-"}</div>
              <div className="text-sm text-slate-500">NIK {data?.member_nik ?? "-"}</div>
              <div className="text-sm text-slate-500">Relasi {data?.family_relation ?? "-"}</div>
            </div>
          </div>

          <div className="flex gap-3 rounded-md border border-slate-200 p-4">
            <Home className="mt-1 h-5 w-5 text-slate-500" />
            <div>
              <div className="text-sm text-slate-500">Data Keluarga</div>
              <div className="mt-1 font-semibold">{data?.family_no_kk ?? "-"}</div>
              <div className="text-sm text-slate-500">{data?.family_address ?? "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasFamily ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
            <PackageOpen className="h-10 w-10" />
            <div className="font-medium text-slate-700">Data keluarga belum terhubung</div>
            <p className="max-w-md text-sm">
              Akun Anda sudah aktif, tetapi data member belum terhubung ke family. Hubungi admin untuk
              melengkapi data keluarga.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <Icon className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-3 text-2xl font-semibold">{item.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pembayaran Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {latestPayment ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <div className="text-sm text-slate-500">Nominal</div>
                <div className="mt-1 font-semibold">{formatCurrency(latestPayment.amount)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Tanggal</div>
                <div className="mt-1 font-semibold">{formatDate(latestPayment.payment_date)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Periode</div>
                <div className="mt-1 font-semibold">
                  {latestPayment.period_month && latestPayment.period_year
                    ? `${latestPayment.period_month}/${latestPayment.period_year}`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Metode</div>
                <div className="mt-1 font-semibold">{latestPayment.payment_method ?? "-"}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-slate-500">
              <PackageOpen className="h-8 w-8" />
              Belum ada pembayaran IPL
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PageContent() {
  const [authUser, setAuthUser] = useState<AuthUserInterface | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [residentData, setResidentData] = useState<ResidentDashboardInterface | null>(null);
  const { callApi, loading } = useApiService("getDataResidentDashboard");

  useEffect(() => {
    const user = getAuthUser();
    setAuthUser(user);
    setSessionReady(true);

    if (user?.role_code?.toUpperCase() === "WRG") {
      callApi({}, {
        onSuccess(response) {
          setResidentData(response.data ?? null);
        },
      });
    }
  }, [callApi]);

  if (!sessionReady) {
    return <DashboardSkeleton />;
  }

  if (authUser?.role_code?.toUpperCase() === "WRG") {
    return <ResidentDashboard data={residentData} loading={loading} />;
  }

  return <AdminDashboard />;
}
