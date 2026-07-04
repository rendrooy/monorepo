import Link from "next/link";
import { Button } from "@monorepo/ui/components/button";

export default function ForbiddenPage() {
    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">403</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                    Akses tidak tersedia
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                    Role Anda belum memiliki permission READ untuk halaman ini.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">Kembali ke Dashboard</Link>
                </Button>
            </div>
        </main>
    );
}
