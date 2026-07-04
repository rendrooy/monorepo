"use client";

import { useApiService } from "@/hooks";
import { getAccessToken, setAccessToken, setAuthMenu, setAuthUser } from "@/utils/auth-storage";
import type { AuthLoginResponse, BaseResponse } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const { callApi, loading } = useApiService("loginAuth");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const callbackUrl = useMemo(() => {
        if (typeof window === "undefined") {
            return "/dashboard";
        }

        return new URLSearchParams(window.location.search).get("callbackUrl") || "/dashboard";
    }, []);

    useEffect(() => {
        if (getAccessToken()) {
            router.replace(callbackUrl);
        }
    }, [callbackUrl, router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        await callApi(
            {
                username,
                password,
            },
            {
                onSuccess(response: BaseResponse<AuthLoginResponse | null>) {
                    const data = response.data;

                    if (!data?.access_token) {
                        setErrorMessage("Login gagal");
                        return;
                    }

                    setAccessToken(data.access_token);
                    setAuthUser(data.user);
                    setAuthMenu(data.menu);
                    toast.success("Login berhasil");
                    router.replace(callbackUrl);
                },
                onError(error: BaseResponse) {
                    const message = error.message || "Username atau password tidak sesuai";
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
                    <CardTitle>Login HomeHub</CardTitle>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username atau Email</Label>
                            <Input
                                id="username"
                                name="username"
                                autoComplete="username"
                                placeholder="Masukkan username atau email"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Masukkan password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="pr-11"
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

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !username || !password}
                        >
                            {loading ? "Memproses..." : "Login"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
