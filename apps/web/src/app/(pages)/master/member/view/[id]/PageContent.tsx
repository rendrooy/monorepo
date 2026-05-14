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
    const { callApi: callDetailMember, loading: loadingDetailMem } = useApiService("getDataMember")
    const router = useRouter();
    const id = useParams().id;
    const formMember = useFormik<MasterMemberInterface>(
        {
            initialValues: {
                name: "",
                address: "",
                nik: "",
                sex: "",
                phone: "",
                religion: ""
            },
            onSubmit: () => {

            }
        }
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
                                disabled
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
                                type="number"
                                name="nik"
                                disabled
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
                                type="number"
                                disabled
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
                                disabled
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
                                disabled
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
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}