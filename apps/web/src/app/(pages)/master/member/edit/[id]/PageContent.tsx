"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import * as Yup from "yup";
// import type {BaseResponse, MasterUserInterface} from "@monorepo/types";
// import {SharedDropdown} from "@/components/SharedDropdown";
// import {useServiceApi} from "@/hooks";
import { toast } from "sonner";
import { useApiService } from "@/hooks";
import type { BaseResponse, MasterMemberInterface } from "@monorepo/types";
import { SharedDropdown } from "@/components/SharedDropdown";
import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id;
    const { callApi: callUpdateMember, loading: loadingUpdateMember } = useApiService("updateDataMember")
    const { callApi: callDetailMember, loading: loadingDetailMember } = useApiService("getDataMember")

    const memberValidationSchema = Yup.object({
        name: Yup.string()
            .required("Nama wajib diisi")
            .min(3, "Minimal 3 karakter"),

        address: Yup.string()
            .required("Alamat wajib diisi"),

        nik: Yup.string()
            .required("NIK wajib diisi")
            .matches(/^\d+$/, "NIK harus angka")
            .length(16, "NIK harus 16 digit"),

        sex: Yup.string()
            .required("Jenis kelamin wajib dipilih"),

        phone: Yup.string()
            .required("No HP wajib diisi")
            .matches(/^\d+$/, "No HP harus angka")
            .min(10, "Minimal 10 digit")
            .max(13, "Maksimal 13 digit"),

        religion: Yup.string()
            .required("Agama wajib dipilih"),
    });

    const formMember = useFormik<MasterMemberInterface>(
        {
            initialValues: {
                id: "",
                name: "",
                address: "",
                nik: "",
                sex: "",
                phone: "",
                religion: ""
            }, validationSchema: memberValidationSchema,

            onSubmit: () => {

            }
        }
    )

    const handleSubmit = useCallback(
        async () => {
            await callUpdateMember(
                {
                    ...formMember.values
                },
                {
                    onSuccess(data: BaseResponse) {
                        router.back()
                        toast.success(data.message)
                    },
                    onError(error) {
                        toast.error(error)
                    },
                }
            )
        }, [formMember.values]
    )

    const handleGetDetail = useCallback(
        async (
            request: string
        ) => {
            await callDetailMember(
                {
                    id: request
                },
                {
                    onSuccess(response: BaseResponse<MasterMemberInterface>) {
                        console.log(response)
                        formMember.setValues(response.data!)
                        // router.back()
                        toast.success(response.message)
                    },
                    onError(error) {
                        toast.error(error)
                    },
                }
            )
        }, []
    )

    useEffect(() => {
        handleGetDetail(id!.toString())
    }, [])

    return (
        <div className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Masukan Data Warga</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nama</Label>
                            <Input
                                className="bg-white border border-slate-200"
                                id="name"
                                name="name"
                                placeholder="Masukkan nama warga"
                                value={formMember.values.name ?? ""}
                                onChange={formMember.handleChange}
                                onBlur={formMember.handleBlur}
                                error={formMember.errors.name}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>NIK</Label>
                            <Input
                                className="bg-white border border-slate-200"
                                id="nik"
                                name="nik"
                                placeholder="Masukkan NIK warga"
                                value={formMember.values.nik ?? ""}
                                onChange={formMember.handleChange}
                                onBlur={formMember.handleBlur}
                                error={formMember.errors.nik}
                            />
                        </div><div className="space-y-2">
                            <Label>No HP</Label>
                            <Input
                                className="bg-white border border-slate-200"
                                id="phone"
                                name="phone"
                                placeholder="Masukkan no HP"
                                value={formMember.values.phone ?? ""}
                                onChange={formMember.handleChange}
                                onBlur={formMember.handleBlur}
                                error={formMember.errors.phone}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Alamat</Label>
                            <Input
                                className="bg-white border border-slate-200"
                                id="address"
                                name="address"
                                placeholder="Masukkan alamat warga"
                                value={formMember.values.address ?? ""}
                                onChange={formMember.handleChange}
                                onBlur={formMember.handleBlur}
                                error={formMember.errors.address}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label> Jenis Kelamin</Label>
                            <SharedDropdown
                                id={"sex"}
                                placeholder={"Pilih Jenis Kelamin"}
                                onValueChange={(value) => {
                                    formMember.setFieldValue("sex", value)
                                    formMember.setFieldTouched("sex")
                                }}
                                value={formMember.values.sex ?? ""}
                                options={[
                                    {
                                        id: "MALE",
                                        label: "Male"
                                    },
                                    {
                                        id: "FEMALE",
                                        label: "Female"
                                    },
                                ]}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                onClick={() => {
                                    router.back()
                                }}
                                type="button" variant="outline">
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                type="submit"
                                onClick={handleSubmit}

                            >Simpan</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}