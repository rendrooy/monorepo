"use client";

import { Activity, Building2, CreditCard, FileClock, KeyRound, LogOut, Menu, Package, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { clearPlatformSession, getPlatformToken, getPlatformUser } from "@/utils/platform-auth-storage";

const navigation = [
  { href: "/platform/tenants", icon: Building2, label: "Tenant" },
  { href: "/platform/plans", icon: Package, label: "Paket" },
  { href: "/platform/payments", icon: CreditCard, label: "Pembayaran" },
  { href: "/platform/access", icon: KeyRound, label: "Akses" },
  { href: "/platform/audit", icon: FileClock, label: "Audit" },
  { href: "/platform/operations", icon: Activity, label: "Operasional" },
];

export default function PlatformConsoleLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const user = getPlatformUser();
  useEffect(() => { if (!getPlatformToken()) router.replace("/platform/login"); else setReady(true); }, [router]);
  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Memeriksa session platform...</div>;

  const sidebar = (
    <div className="flex h-full flex-col bg-[#121826] text-white">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-emerald-400" />HomeHub</div><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X className="h-5 w-5" /></button></div>
      <nav className="flex-1 space-y-1 px-3 py-5">{navigation.map((item) => { const active = pathname.startsWith(item.href); const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm ${active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{item.label}</Link>; })}</nav>
      <div className="border-t border-white/10 p-4"><p className="truncate text-sm font-medium">{user?.username}</p><p className="truncate text-xs text-slate-400">{user?.email}</p><button className="mt-4 flex items-center gap-2 text-sm text-slate-300 hover:text-white" onClick={() => { clearPlatformSession(); router.replace("/platform/login"); }}><LogOut className="h-4 w-4" />Keluar</button></div>
    </div>
  );

  return <div className="min-h-screen bg-slate-50"><aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">{sidebar}</aside>{open ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-label="Tutup menu" /><aside className="relative h-full w-72">{sidebar}</aside></div> : null}<header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white px-4 lg:left-60 lg:px-7"><button className="mr-3 rounded-md p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu className="h-5 w-5" /></button><div><p className="text-sm font-semibold text-slate-900">Platform Console</p><p className="text-xs text-slate-500">Operasional multi-tenant</p></div></header><main className="pt-16 lg:pl-60"><div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div></main></div>;
}
