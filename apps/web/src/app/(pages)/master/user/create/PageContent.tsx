"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Button } from "@monorepo/ui/components/button";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import { useApiService } from "@/hooks";
import { useCallback, useEffect, useState } from "react";
import type { BaseResponse, BaseResponseDropdown, MasterRoleInterface, MasterUserInterface } from "@monorepo/types";
import { toast } from "sonner";
import { Separator } from "@monorepo/ui/components/separator";
import { SharedDropdown, type SharedDropdownOption } from "@/components/SharedDropdown";

export default function PageContent() {

    const router = useRouter();
    const { callApi: callCreateRole, loading: loadingCreate } = useApiService("insertDataUser");
    const { callApi: callLoadRole, loading: loadingLoadRole } = useApiService("loadDataRole");
    const [optionsRole, setOptionsRole] = useState<SharedDropdownOption>([]);
    const formik = useFormik<MasterUserInterface>({
        initialValues: {
            email: "",
            username: "",
            role_id: "",
            member_id: "",
            password: "",
        },
        // validationSchema,
        onSubmit: () => { handleSubmit(); },
    });

    const handleSubmit = useCallback(async () => {
        await callCreateRole(
            { ...formik.values },
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

    const loadDataRole = useCallback(async () => {
        await callLoadRole({
            metadata: {
                page: 1,
                pageSize: 999
            },
            // params: {}
        }, {
            onSuccess(data: BaseResponse<MasterRoleInterface>) {
                const tempOption = data!.data!.map((item) => ({
                    label: item.role_name,
                    id: item.id.toString(),
                }))

                setOptionsRole(tempOption as SharedDropdownOption)
                // setOptionsRole(data.data)
            },
        });

    }, []);

    useEffect(() => {
        loadDataRole()
    }, [])

    return (
        <div className="mt-6">
            <form onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Tambah Data User</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Username</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="Masukkan data username"
                                    value={formik.values.username ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.username ? formik.errors.username : undefined}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Kode Role</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    placeholder="Masukkan data email"
                                    value={formik.values.email ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.email ? formik.errors.email : undefined}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <SharedDropdown
                                    id={"member"}
                                    label="Member"
                                    value={formik.values.member_id ?? ""}
                                    onValueChange={function (value: string): void {
                                        throw new Error("Function not implemented.");
                                    }}
                                    placeholder="Masukkan data member"
                                >
                                </SharedDropdown>
                            </div>
                            <div className="space-y-2">
                                <SharedDropdown
                                    id={"role_id"}
                                    label="Role"
                                    value={formik.values.role_id ?? ""}
                                    onValueChange={function (value: string): void {
                                        throw new Error("Function not implemented.");
                                    }}
                                    options={optionsRole ?? []}
                                    // options={optionsRole ?? []}
                                    placeholder="Masukkan data role"
                                >
                                </SharedDropdown>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={loadingCreate}>
                                {loadingCreate ? "Menyimpan..." : "Simpan"}
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </form>
        </div>
    )
}