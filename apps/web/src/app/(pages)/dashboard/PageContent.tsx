"use client";

import { getAuthUser } from "@/utils/auth-storage";
import type { AuthUserInterface } from "@monorepo/types";
import { Badge } from "@monorepo/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { CheckCircle2, Home, PackageOpen, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

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

function ResidentDashboard({ user }: { user: AuthUserInterface | null }) {
  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Dashboard Warga</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Ringkasan akun warga. Module IPL sedang disiapkan ulang.
              </p>
            </div>
            <Badge className="w-fit bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Aktif
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex gap-3 rounded-md border border-slate-200 p-4">
            <UserRound className="mt-1 h-5 w-5 text-slate-500" />
            <div>
              <div className="text-sm text-slate-500">Data Akun</div>
              <div className="mt-1 font-semibold">{user?.username ?? "-"}</div>
              <div className="text-sm text-slate-500">{user?.email ?? "-"}</div>
            </div>
          </div>

          <div className="flex gap-3 rounded-md border border-slate-200 p-4">
            <Home className="mt-1 h-5 w-5 text-slate-500" />
            <div>
              <div className="text-sm text-slate-500">Data Warga</div>
              <div className="mt-1 font-semibold">{user?.member_name ?? "-"}</div>
              <div className="text-sm text-slate-500">Role {user?.role_code ?? "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
          <PackageOpen className="h-10 w-10" />
          <div className="font-medium text-slate-700">Module IPL sedang direwrite</div>
          <p className="max-w-md text-sm">
            Ringkasan tagihan, pembayaran terakhir, dan fitur warga terkait IPL akan aktif lagi setelah module baru selesai.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PageContent() {
  const [authUser, setAuthUser] = useState<AuthUserInterface | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    setAuthUser(getAuthUser());
    setSessionReady(true);
  }, []);

  if (!sessionReady) {
    return <DashboardSkeleton />;
  }

  const roleCode = authUser?.role_code?.toUpperCase();
  if (roleCode === "WARGA" || roleCode === "WRG") {
    return <ResidentDashboard user={authUser} />;
  }

  return <AdminDashboard />;
}
