"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useApiService } from "@/hooks";
import type { BaseResponse, MasterUserInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const router = useRouter();
    const { callApi, loading } = useApiService("registerAuth");
    const [tenantSlug, setTenantSlug] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [nik, setNik] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const canSubmit = tenantSlug && /^\d{16}$/.test(nik) && username && email && password;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        await callApi(
            {
                tenant_slug: tenantSlug.trim().toLowerCase(),
                nik,
                username,
                email,
                password,
            },
            {
                onSuccess(response: BaseResponse<MasterUserInterface | null>) {
                    toast.success(response.message || "Registrasi berhasil dikirim");
                    router.push("/login");
                },
                onError(error: BaseResponse) {
                    const message = error.message || "Registrasi gagal";
                    setErrorMessage(message);
                    toast.error(message);
                },
            },
        );
    };

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-slate-200">
                <CardHeader>
                    <CardTitle>Registrasi Akun</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="tenantSlug">Kode Perumahan</Label>
                            <Input
                                id="tenantSlug"
                                name="tenantSlug"
                                autoComplete="organization"
                                placeholder="Contoh: griya-asri"
                                value={tenantSlug}
                                onChange={(event) => setTenantSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nik">NIK</Label>
                            <Input
                                id="nik"
                                name="nik"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={16}
                                placeholder="Masukkan NIK yang terdaftar"
                                value={nik}
                                onChange={(event) => setNik(event.target.value.replace(/\D/g, "").slice(0, 16))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Masukkan email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Masukkan password"
                                    className="pr-11"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {errorMessage ? (
                            <p className="text-sm text-red-600">{errorMessage}</p>
                        ) : null}

                        <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
                            {loading ? "Mengirim..." : "Registrasi"}
                        </Button>

                        <div className="text-center text-sm text-slate-600">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                                Login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
