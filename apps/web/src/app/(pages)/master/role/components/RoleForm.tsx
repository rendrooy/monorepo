"use client";

import type { MasterRoleInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import {
    RadioGroup,
    RadioGroupItem,
} from "@monorepo/ui/components/radio-group";
import { Separator } from "@monorepo/ui/components/separator";
import { useFormik } from "formik";
import { useCallback, useMemo } from "react";
import * as Yup from "yup";
import { RolePermissionMatrix } from "./RolePermissionMatrix";

export const roleValidationSchema = Yup.object({
    name: Yup.string()
        .required("Nama role wajib diisi")
        .min(3, "Minimal 3 karakter"),
    code: Yup.string().required("Kode role wajib diisi"),
});

type RoleFormProps = {
    disabled?: boolean;
    initialValues: MasterRoleInterface;
    loading?: boolean;
    onBack: () => void;
    onSubmit?: (values: MasterRoleInterface) => Promise<void> | void;
    submitText?: string;
    title: string;
};

const defaultValues: MasterRoleInterface = {
    name: "",
    code: "",
    desc: "",
    is_active: true,
    role_permissions: [],
};

export function RoleForm({
    disabled = false,
    initialValues,
    loading = false,
    onBack,
    onSubmit,
    submitText = "Simpan",
    title,
}: RoleFormProps) {
    const resolvedInitialValues = useMemo(
        () => ({
            ...defaultValues,
            ...initialValues,
        }),
        [initialValues],
    );

    const formik = useFormik<MasterRoleInterface>({
        initialValues: resolvedInitialValues,
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validateOnMount: true,
        validationSchema: disabled ? undefined : roleValidationSchema,
        onSubmit: async (values) => {
            await onSubmit?.(values);
        },
    });

    const handlePermissionChange = useCallback(
        (permissions: NonNullable<MasterRoleInterface["role_permissions"]>) => {
            formik.setFieldValue("role_permissions", permissions);
        },
        [formik],
    );

    return (
        <div className="mt-6">
            <form onSubmit={formik.handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Role</Label>
                                <Input
                                    disabled={disabled}
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
                                    disabled={disabled}
                                    id="code"
                                    name="code"
                                    placeholder="Masukkan kode role"
                                    value={formik.values.code ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.code ? formik.errors.code : undefined}
                                />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="desc">Deskripsi</Label>
                                <Input
                                    disabled={disabled}
                                    id="desc"
                                    name="desc"
                                    placeholder="Masukkan deskripsi role"
                                    value={formik.values.desc ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <RadioGroup
                                    disabled={disabled}
                                    value={String(formik.values.is_active)}
                                    onValueChange={(value) => {
                                        formik.setFieldValue("is_active", value === "true");
                                    }}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="true" id="role_active" />
                                        <Label htmlFor="role_active">Aktif</Label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="false" id="role_inactive" />
                                        <Label htmlFor="role_inactive">Tidak Aktif</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        <Separator />

                        <RolePermissionMatrix
                            disabled={disabled}
                            permissions={formik.values.role_permissions ?? []}
                            onChange={handlePermissionChange}
                        />

                        <Separator />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onBack}>
                                {disabled ? "Kembali" : "Batal"}
                            </Button>
                            {!disabled ? (
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Menyimpan..." : submitText}
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
