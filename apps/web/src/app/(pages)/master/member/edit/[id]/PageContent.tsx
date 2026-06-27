"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Button } from "@monorepo/ui/components/button";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useApiService } from "@/hooks";
import type { BaseResponse, MasterMemberInterface } from "@monorepo/types";
// import { SharedDropdown } from "@monorepo/components/redDropdown";
import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Separator } from "@monorepo/ui/components/separator";
import { SharedDropdown } from "@/components/SharedDropdown";
import { toast } from "sonner";
import { MESSAGES } from "@/constants";

const SEX_OPTIONS = [
    { id: "L", label: "Laki-laki" },
    { id: "P", label: "Perempuan" },
];

const BLOOD_TYPE_OPTIONS = [
    { id: "A", label: "A" },
    { id: "B", label: "B" },
    { id: "AB", label: "AB" },
    { id: "O", label: "O" },
];

const RELIGION_OPTIONS = [
    { id: "ISLAM", label: "Islam" },
    { id: "KRISTEN", label: "Kristen" },
    { id: "KATOLIK", label: "Katolik" },
    { id: "HINDU", label: "Hindu" },
    { id: "BUDDHA", label: "Buddha" },
    { id: "KONGHUCU", label: "Konghucu" },
];

const FAMILY_RELATION_OPTIONS = [
    { id: "KEPALA_KELUARGA", label: "Kepala Keluarga" },
    { id: "ISTRI", label: "Istri" },
    { id: "ANAK", label: "Anak" },
    { id: "ORANG_TUA", label: "Orang Tua" },
    { id: "LAINNYA", label: "Lainnya" },
];

const validationSchema = Yup.object({
    name: Yup.string().required("Nama wajib diisi").min(3, "Minimal 3 karakter"),
    nik: Yup.string()
        .required("NIK wajib diisi")
        .matches(/^\d+$/, "NIK harus angka")
        .length(16, "NIK harus 16 digit"),
    phone: Yup.string()
        .required("No HP wajib diisi")
        .matches(/^\d+$/, "No HP harus angka")
        .min(10, "Minimal 10 digit")
        .max(13, "Maksimal 13 digit"),
    address: Yup.string().required("Alamat wajib diisi"),
    sex: Yup.string().required("Jenis kelamin wajib dipilih"),
    religion: Yup.string().required("Agama wajib dipilih"),
    bod: Yup.string().required("Tanggal lahir wajib diisi"),
});

export default function PageContent() {
    const router = useRouter();
    const id = useParams().id
    const { callApi: callUpdateMember, loading: loadingUpdate } = useApiService("updateDataMember");
    const { callApi: callGetMemberById, loading: loadingGet } = useApiService("getDataMember");

    const formik = useFormik<MasterMemberInterface>({
        initialValues: {
            name: "",
            nik: "",
            phone: "",
            address: "",
            sex: "",
            blood_type: "",
            bod: "",
            boc: "",
            profession: "",
            religion: "",
            family_relation: "",
            // family_id: "",
        },
        validationSchema,
        onSubmit: () => { handleSubmit(); },
    });

    function formatDateToInput(data: string) {
        if (!data) return "";

        return new Date(data).toISOString().split("T")[0];
    }

    const handleSubmit = useCallback(async () => {
        const id = toast.loading(MESSAGES.INFO.LOADING);

        await callUpdateMember(
            { ...formik.values },
            {
                onSuccess(data: BaseResponse) {
                    toast.success(MESSAGES.SUCCESS.INSERT, { id });
                    router.back();
                },
                onError(error) {
                    toast.error(
                        error?.message || MESSAGES.ERROR.INSERT,
                        { id }
                    );
                },
            }
        );
    }, [formik.values]);

    const getDataMember = useCallback(async () => {
        console.info(id)
        if (!id) return;

        await callGetMemberById(
            { id: id as string },
            {
                onSuccess(data) {
                    const values = data.data;

                    formik.setValues({
                        ...values,
                        bod: formatDateToInput(values.bod),
                    });

                },
                onError(error) {
                    toast.error(MESSAGES.ERROR.GENERAL)
                },
            }
        );
    }, []);

    useEffect(() => {
        getDataMember()
    }, [id])

    const field = (
        name: keyof MasterMemberInterface,
        label: string,
        placeholder: string,
        type = "text"
    ) => (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                value={(formik.values[name] as string) ?? ""}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched[name] ? (formik.errors[name] as string) : undefined}
            />
        </div>
    );

    const dropdown = (
        name: keyof MasterMemberInterface,
        label: string,
        placeholder: string,
        options: { id: string; label: string }[]
    ) => (
        <div className="space-y-2">
            <Label>{label}</Label>
            <SharedDropdown
                clearable
                id={name}
                placeholder={placeholder}
                value={(formik.values[name] as string) ?? ""}
                onValueChange={(value) => {
                    formik.setFieldValue(name, value);
                    formik.setFieldTouched(name);
                }}
                options={options}
            />
            {formik.touched[name] && formik.errors[name] && (
                <p className="text-xs text-red-500">{formik.errors[name] as string}</p>
            )}
        </div>
    );

    return (
        <div className="mt-6">
            <form onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Tambah Data Warga</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* DATA PRIBADI */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-4">Data Pribadi</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {field("name", "Nama Lengkap", "Masukkan nama lengkap")}
                                {field("nik", "NIK", "Masukkan 16 digit NIK")}
                                {field("phone", "No HP", "Masukkan no HP")}
                                {field("bod", "Tanggal Lahir", "", "date")}
                                {field("boc", "Tempat Lahir", "Masukkan tempat lahir")}
                                {field("profession", "Profesi", "Masukkan profesi")}
                                {dropdown("sex", "Jenis Kelamin", "Pilih jenis kelamin", SEX_OPTIONS)}
                                {dropdown("blood_type", "Golongan Darah", "Pilih golongan darah", BLOOD_TYPE_OPTIONS)}
                                {dropdown("religion", "Agama", "Pilih agama", RELIGION_OPTIONS)}
                            </div>
                        </div>

                        <Separator />

                        {/* ALAMAT & KELUARGA */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-4">Alamat & Keluarga</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="address">Alamat</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        placeholder="Masukkan alamat lengkap"
                                        value={formik.values.address ?? ""}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={formik.touched.address ? formik.errors.address : undefined}
                                    />
                                </div>
                                {/* {field("family_id", "ID Keluarga", "Masukkan ID keluarga")}
                                {dropdown("family_relation", "Status dalam Keluarga", "Pilih status", FAMILY_RELATION_OPTIONS)} */}
                            </div>
                        </div>

                        <Separator />

                        {/* ACTIONS */}
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
