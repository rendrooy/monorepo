"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { useApiService } from "@/hooks";
import type { BaseResponse, BaseResponseDropdown, MasterUserInterface } from "@monorepo/types";
import { SharedDropdown } from "@/components/SharedDropdown";
import { useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";

const validationSchema = Yup.object({
    username: Yup.string().required("Username wajib diisi").min(3, "Minimal 3 karakter"),
    email: Yup.string().email("Format email tidak valid").required("Email wajib diisi"),
    role_id: Yup.string().required("Role wajib dipilih"),
});

export default function PageContent() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const { callApi: callGetUser } = useApiService("getDataUser");
    const { callApi: callUpdateUser, loading: loadingUpdate } = useApiService("updateDataUser");
    const { callApi: callDropdownRole } = useApiService("dropdownRole");
    const { callApi: callDropdownMember } = useApiService("dropdownMember");

    const formik = useFormik<Partial<MasterUserInterface>>({
        initialValues: {
            username: "",
            email: "",
            password: "",
            role_id: "",
            member_id: "",
        },
        validationSchema,
        onSubmit: () => { handleSubmit(); },
    });

    useEffect(() => {
        if (!id) return;
        callGetUser(
            { id } as MasterUserInterface,
            {
                onSuccess(response) {
                    const data = response.data as MasterUserInterface;
                    formik.setValues({
                        id: data.id,
                        username: data.username ?? "",
                        email: data.email ?? "",
                        password: "",
                        role_id: data.role_id ?? "",
                        member_id: data.member_id ?? "",
                    });
                },
                onError() {
                    toast.error("Gagal memuat data user");
                },
            }
        );
    }, [id]);

    const handleSubmit = useCallback(async () => {
        await callUpdateUser(
            formik.values as MasterUserInterface,
            {
                onSuccess(data: BaseResponse) {
                    toast.success(data.message);
                    router.back();
                },
                onError(error) {
                    toast.error(error);
                },
            }
        );
    }, [formik.values]);

    return (
        <div className="mt-6">
            <form onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Data User</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* AKUN */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-4">Informasi Akun</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        placeholder="Masukkan username"
                                        value={formik.values.username ?? ""}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={formik.touched.username ? formik.errors.username : undefined}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Masukkan email"
                                        value={formik.values.email ?? ""}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={formik.touched.email ? formik.errors.email : undefined}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password Baru</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="Kosongkan jika tidak diubah"
                                        value={formik.values.password ?? ""}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={formik.touched.password ? formik.errors.password : undefined}
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* RELASI */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-4">Role & Member</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <SharedDropdown
                                        id="role_id"
                                        placeholder="Pilih role"
                                        clearable
                                        value={formik.values.role_id ?? ""}
                                        onValueChange={(value) => formik.setFieldValue("role_id", value)}
                                        fetchOptions={async (search, signal) => {
                                            return new Promise((resolve, reject) => {
                                                signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
                                                callDropdownRole(
                                                    { params: { search } },
                                                    {
                                                        onSuccess(res) {
                                                            resolve((res.data ?? []).map((r: BaseResponseDropdown) => ({ id: r.value, label: r.label })));
                                                        },
                                                        onError() { resolve([]); },
                                                    }
                                                );
                                            });
                                        }}
                                        searchable
                                    />
                                    {formik.touched.role_id && formik.errors.role_id && (
                                        <p className="text-xs text-red-500">{formik.errors.role_id}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Member</Label>
                                    <SharedDropdown
                                        id="member_id"
                                        placeholder="Pilih member (opsional)"
                                        clearable
                                        value={formik.values.member_id ?? ""}
                                        onValueChange={(value) => formik.setFieldValue("member_id", value)}
                                        fetchOptions={async (search, signal) => {
                                            return new Promise((resolve, reject) => {
                                                signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
                                                callDropdownMember(
                                                    { params: { search } },
                                                    {
                                                        onSuccess(res) {
                                                            resolve((res.data ?? []).map((r: BaseResponseDropdown) => ({ id: r.value, label: r.label })));
                                                        },
                                                        onError() { resolve([]); },
                                                    }
                                                );
                                            });
                                        }}
                                        searchable
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={loadingUpdate}>
                                {loadingUpdate ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
