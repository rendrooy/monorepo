"use client";

import type { PlatformLoginResponse } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { API_BASE_URL } from "@/services/platform-api";
import { getPlatformToken, setPlatformSession } from "@/utils/platform-auth-storage";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (getPlatformToken()) router.replace("/platform/tenants"); }, [router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/platform/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      const data = result.data as PlatformLoginResponse | null;
      if (!response.ok || !data?.access_token) throw new Error(result.message || "Login gagal");
      setPlatformSession(data.access_token, data.user);
      toast.success("Login platform berhasil");
      router.replace("/platform/tenants");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Login gagal"); }
    finally { setLoading(false); }
  };

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="hidden bg-[#121826] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold"><ShieldCheck className="h-6 w-6 text-emerald-400" />HomeHub Platform</div>
        <div className="max-w-xl"><h1 className="text-4xl font-semibold leading-tight">Operasikan seluruh tenant dari satu tempat.</h1><p className="mt-4 text-base leading-7 text-slate-300">Kelola onboarding, paket, pembayaran subscription, dan audit operasional HomeHub.</p></div>
        <p className="text-sm text-slate-400">Platform Console</p>
      </section>
      <section className="flex items-center px-6 py-10 sm:px-12">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-6">
          <div><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-slate-900 text-white lg:hidden"><ShieldCheck className="h-5 w-5" /></div><h2 className="text-2xl font-semibold text-slate-900">Login Super Admin</h2><p className="mt-2 text-sm text-slate-500">Gunakan akun platform, bukan akun tenant.</p></div>
          <div className="space-y-2"><Label htmlFor="platform-username">Username atau Email</Label><Input id="platform-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="platform-password">Password</Label><div className="relative"><Input id="platform-password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-10" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => setShowPassword((value) => !value)} aria-label="Tampilkan password">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <Button className="w-full" disabled={loading || !username || !password}>{loading ? "Memproses..." : "Masuk"}</Button>
        </form>
      </section>
    </main>
  );
}
