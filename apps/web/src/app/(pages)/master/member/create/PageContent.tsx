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
import { useCallback } from "react";
import { useRouter } from "next/navigation";

export default function PageContent() {
    const { callApi: callCreateMember, loading: loadingCreateMem } = useApiService("insertDataMember")
    const router = useRouter();


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
            await callCreateMember(
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
//
// export default function PageContent() {
//
//     const { request: requestCreate, loading: loadingCreate, error } =
//         useServiceApi<MasterUserInterface, BaseResponse<null>>();
//
//     const formik = useFormik<MasterUserInterface>({
//         initialValues: {
//             email: "",
//             password: "",
//             username: "",
//             role_id: "",
//             member_id: "",
//         },
//
//         validationSchema: Yup.object({
//             username: Yup.string()
//                 .min(3, "Minimal 3 karakter")
//                 .required("Username wajib diisi"),
//
//             email: Yup.string()
//                 .email("Format email tidak valid")
//                 .required("Email wajib diisi"),
//
//             password: Yup.string()
//                 .min(6, "Minimal 6 karakter")
//                 .required("Password wajib diisi"),
//
//             role_id: Yup.string().required("Role wajib dipilih"),
//
//             member_id: Yup.string().required("Member ID wajib diisi"),
//         }),
//
//         onSubmit: (values) => {
//
//
//         },
//     });
//
//     const handleSubmit = async ()=> {
//         try {
//             const res = await requestCreate({
//                 method: "POST",
//                 url: "http://localhost:3001/v1/user/insert",
//                 data: formik.values,
//             });
//
//         } catch (error: any) {
//             toast.error(`${error}`);
//         }
//     }
//
//
//     return (
//         <div className="mt-6 max-w-2xl">
//             <Card>
//                 <CardHeader>
//                     <CardTitle>Masukan Data User</CardTitle>
//                 </CardHeader>
//
//                 <CardContent>
//                         {/* GRID */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             {/* Username */}
//                             <div className="space-y-2">
//                                 <Label htmlFor="username">Username</Label>
//                                 <Input
//                                     className="bg-white border border-slate-200"
//                                     id="username"
//                                     name="username"
//                                     placeholder="Masukkan username"
//                                     value={formik.values.username}
//                                     onChange={formik.handleChange}
//                                     onBlur={formik.handleBlur}
//                                     error={formik.errors.username}
//                                 />
//                             </div>
//
//                             {/* Email */}
//                             <div className="space-y-2">
//                                 <Label htmlFor="email">Email</Label>
//                                 <Input
//                                     className="bg-white border border-slate-200"
//                                     id="email"
//                                     name="email"
//                                     type="email"
//                                     placeholder="Masukkan email"
//                                     value={formik.values.email}
//                                     onChange={formik.handleChange}
//                                     onBlur={formik.handleBlur}
//                                     error={formik.errors.email}
//                                 />
//                             </div>
//
//                             {/* Password */}
//                             <div className="space-y-2">
//                                 <Label htmlFor="password">Password</Label>
//                                 <Input
//                                     className="bg-white border border-slate-200"
//                                     id="password"
//                                     name="password"
//                                     type="password"
//                                     placeholder="Masukkan password"
//                                     value={formik.values.password}
//                                       onChange={formik.handleChange}
//                                     onBlur={formik.handleBlur}
//                                     error={formik.errors.password}
//                                 />
//                             </div>
//
//
//                             {/* Member ID */}
//                             <div className="space-y-2">
//                                 <Label htmlFor="member_id">Member ID</Label>
//                                 <SharedDropdown
//                                 id={"member_id"}
//                                 placeholder={"Pilih Member"}
//                                 onValueChange={(value)=>{}}
//                                 value={formik.values.member_id??""}
//                                 options={[]}
//                                 />
//                             </div>
//
//                             {/*/!* Role *!/*/}
//                             <div className="space-y-2">
//                                 <Label htmlFor="role_id">Role ID</Label>
//                                 <SharedDropdown
//                                     id={"role_id"}
//                                     placeholder={"Pilih Role"}
//                                     onValueChange={(value)=>{}}
//                                     value={formik.values.role_id??""}
//                                     options={[]}
//                                 />
//                             </div>
//                         </div>
//
//                         {/* ACTION */}
//                         <div className="flex justify-end gap-2">
//                             <Button type="button" variant="outline">
//                                 Cancel
//                             </Button>
//                             <Button
//                                 variant="default"
//                                 // className="bg-blue-500 hover:bg-blue-700 border border-slate-200"
//                                 type="submit"
//                                 onClick={handleSubmit}
//
//                             >Simpan</Button>
//                         </div>
//                 </CardContent>
//             </Card>
//         </div>
//     );
// }