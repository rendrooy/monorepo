"use client";

import { SharedDropdown, type SharedDropdownOption } from "@/components/SharedDropdown";
import { useApiService } from "@/hooks";
import type {
    BaseResponse,
    BaseResponseDropdown,
    MasterUserInterface,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Separator } from "@monorepo/ui/components/separator";
import { useFormik } from "formik";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Yup from "yup";

export const userValidationSchema = Yup.object({
    username: Yup.string().required("Username wajib diisi"),
    email: Yup.string().email("Format email tidak valid").required("Email wajib diisi"),
    role_id: Yup.string().required("Role wajib dipilih"),
    password: Yup.string().required("Password wajib diisi"),
});

type UserFormProps = {
    disabled?: boolean;
    initialValues: MasterUserInterface;
    loading?: boolean;
    onBack: () => void;
    onSubmit?: (values: MasterUserInterface) => Promise<void> | void;
    submitText?: string;
    title: string;
};

const defaultValues: MasterUserInterface = {
    email: "",
    username: "",
    role_id: "",
    member_id: "",
    password: "",
};

export function UserForm({
    disabled = false,
    initialValues,
    loading = false,
    onBack,
    onSubmit,
    submitText = "Simpan",
    title,
}: UserFormProps) {
    const { callApi: callDropdownRole, loading: loadingRole } =
        useApiService("dropdownRole");
    const { callApi: callDropdownMember, loading: loadingMember } =
        useApiService("dropdownMember");

    const [roleOptions, setRoleOptions] = useState<SharedDropdownOption[]>([]);
    const [memberOptions, setMemberOptions] = useState<SharedDropdownOption[]>([]);

    const resolvedInitialValues = useMemo(
        () => ({
            ...defaultValues,
            ...initialValues,
        }),
        [initialValues],
    );

    const formik = useFormik<MasterUserInterface>({
        initialValues: resolvedInitialValues,
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validateOnMount: true,
        validationSchema: disabled ? undefined : userValidationSchema,
        onSubmit: async (values) => {
            await onSubmit?.(values);
        },
    });

    const loadRoleOptions = useCallback(async () => {
        await callDropdownRole(
            {},
            {
                onSuccess(response: BaseResponse<BaseResponseDropdown[]>) {
                    setRoleOptions(
                        (response.data ?? []).map((item) => ({
                            id: item.value,
                            label: item.label,
                        })),
                    );
                },
            },
        );
    }, [callDropdownRole]);

    const loadMemberOptions = useCallback(async () => {
        await callDropdownMember(
            {},
            {
                onSuccess(response: BaseResponse<BaseResponseDropdown[]>) {
                    setMemberOptions(
                        (response.data ?? []).map((item) => ({
                            id: item.value,
                            label: item.label,
                        })),
                    );
                },
            },
        );
    }, [callDropdownMember]);

    useEffect(() => {
        if (disabled) return;

        loadRoleOptions();
        loadMemberOptions();
    }, [disabled, loadMemberOptions, loadRoleOptions]);

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
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    disabled={disabled}
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
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    disabled={disabled}
                                    id="email"
                                    name="email"
                                    placeholder="Masukkan data email"
                                    value={formik.values.email ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.email ? formik.errors.email : undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    disabled={disabled}
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Masukkan password"
                                    value={formik.values.password ?? ""}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.password ? formik.errors.password : undefined}
                                />
                            </div>

                            <div className="space-y-2">
                                <SharedDropdown
                                    clearable={!disabled}
                                    disabled={disabled}
                                    id="member_id"
                                    label="Member"
                                    loading={loadingMember}
                                    value={formik.values.member_id ?? ""}
                                    onValueChange={(value) => {
                                        formik.setFieldValue("member_id", value);
                                        formik.setFieldTouched("member_id");
                                    }}
                                    options={memberOptions}
                                    placeholder="Pilih data member"
                                />
                            </div>

                            <div className="space-y-2">
                                <SharedDropdown
                                    clearable={!disabled}
                                    disabled={disabled}
                                    id="role_id"
                                    label="Role"
                                    loading={loadingRole}
                                    value={formik.values.role_id ?? ""}
                                    onValueChange={(value) => {
                                        formik.setFieldValue("role_id", value);
                                        formik.setFieldTouched("role_id");
                                    }}
                                    options={roleOptions}
                                    placeholder="Pilih data role"
                                />
                                {formik.touched.role_id && formik.errors.role_id ? (
                                    <p className="text-xs text-red-500">{formik.errors.role_id}</p>
                                ) : null}
                            </div>
                        </div>

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
