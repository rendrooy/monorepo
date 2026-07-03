"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Button } from "@monorepo/ui/components/button";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import { useApiService } from "@/hooks";
import type { BaseResponse, MasterRoleInterface } from "@monorepo/types";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@monorepo/ui/components/separator";
import { RadioGroup, RadioGroupItem } from "@monorepo/ui/components/radio-group";

const validationSchema = Yup.object({
    name: Yup.string().required("Nama role wajib diisi").min(3, "Minimal 3 karakter"),
    code: Yup.string().required("Kode role wajib diisi"),
});

export default function PageContent() {
    const router = useRouter();
    const { callApi: callCreateRole, loading: loadingCreate } = useApiService("insertDataRole");

    // const [jenis, setJenis] = useState("ktp");
    const formik = useFormik<MasterRoleInterface>({
        initialValues: {
            name: "",
            code: "",
            is_active: false
        },
        validationSchema,
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

    return (
        <div className="mt-6">
            <form onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Tambah Data Role</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Role</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Masukkan nama role"
                                    value={formik.values.name ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.name ? formik.errors.name : undefined}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Kode Role</Label>
                                <Input
                                    id="code"
                                    name="code"
                                    placeholder="Masukkan kode role"
                                    value={formik.values.code ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.code ? formik.errors.code : undefined}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Kode Role</Label>
                                <div>
                                    <RadioGroup
                                        value={String(formik.values.is_active)}
                                        onValueChange={(value) => {
                                            formik.setFieldValue("is_active", value === "true");
                                        }}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="true" id="active" />
                                            <Label htmlFor="active">Aktif</Label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="false" id="inactive" />
                                            <Label htmlFor="inactive">Tidak Aktif</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
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
    );
}
