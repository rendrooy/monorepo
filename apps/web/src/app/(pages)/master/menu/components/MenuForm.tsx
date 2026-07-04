"use client";

import { SharedDropdown, type SharedDropdownOption } from "@/components/SharedDropdown";
import { useApiService } from "@/hooks";
import type { BaseResponse, MasterMenuInterface } from "@monorepo/types";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Yup from "yup";

const MENU_LEVEL_OPTIONS = [
    { id: "1", label: "Level 1 - Menu Utama" },
    { id: "2", label: "Level 2 - Sub Menu" },
    { id: "3", label: "Level 3 - Sub Menu Detail" },
];

export const menuValidationSchema = Yup.object({
    name: Yup.string().required("Nama menu wajib diisi"),
    code: Yup.string()
        .required("Kode menu wajib diisi")
        .length(4, "Kode menu harus 4 digit")
        .matches(/^\d+$/, "Kode menu hanya boleh berisi angka"),
    path_url: Yup.string().required("Path URL wajib diisi"),
    menu_level: Yup.number().required("Level menu wajib dipilih"),
    parent_id: Yup.string().when("menu_level", {
        is: (value: number) => Number(value) > 1,
        then: (schema) => schema.required("Parent menu wajib dipilih"),
        otherwise: (schema) => schema.nullable(),
    }),
});

type MenuFormProps = {
    disabled?: boolean;
    initialValues: MasterMenuInterface;
    loading?: boolean;
    onBack: () => void;
    onSubmit?: (values: MasterMenuInterface) => Promise<void> | void;
    submitText?: string;
    title: string;
};

const defaultValues: MasterMenuInterface = {
    name: "",
    code: "",
    path_url: "",
    icon: "",
    menu_level: 1,
    parent_id: "",
    sort_order: 0,
    is_active: true,
};

export function MenuForm({
    disabled = false,
    initialValues,
    loading = false,
    onBack,
    onSubmit,
    submitText = "Simpan",
    title,
}: MenuFormProps) {
    const { callApi: callLoadMenu, loading: loadingParent } =
        useApiService("loadDataMenu");
    const { callApi: callGetParentMenu, loading: loadingSelectedParent } =
        useApiService("getDataMenu");
    const [parentOptions, setParentOptions] = useState<SharedDropdownOption[]>([]);
    const parentRequestKeyRef = useRef<string>("");

    const resolvedInitialValues = useMemo(
        () => ({
            ...defaultValues,
            ...initialValues,
            menu_level: initialValues.menu_level ?? 1,
            sort_order: initialValues.sort_order ?? 0,
        }),
        [initialValues],
    );

    const formik = useFormik<MasterMenuInterface>({
        initialValues: resolvedInitialValues,
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validateOnMount: true,
        validationSchema: disabled ? undefined : menuValidationSchema,
        onSubmit: async (values) => {
            const menuLevel = Number(values.menu_level ?? 1);

            await onSubmit?.({
                ...values,
                menu_level: menuLevel,
                parent_id: menuLevel > 1 ? values.parent_id || null : null,
                sort_order: Number(values.sort_order ?? 0),
            });
        },
    });

    const selectedMenuLevel = Number(formik.values.menu_level ?? 1);
    const parentLevel = selectedMenuLevel - 1;
    const currentMenuId = formik.values.id ?? "";
    const currentParentId = formik.values.parent_id ?? "";

    const loadParentOptions = useCallback(async () => {
        const requestKey = `${parentLevel}:${currentMenuId}:${currentParentId}`;

        if (parentRequestKeyRef.current === requestKey) return;

        parentRequestKeyRef.current = requestKey;

        if (parentLevel < 1) {
            setParentOptions([]);
            return;
        }

        await callLoadMenu(
            {
                params: {
                    menu_level: parentLevel,
                },
                metadata: {
                    page: 1,
                    pageSize: 100,
                },
            },
            {
                onSuccess(response: BaseResponse<MasterMenuInterface[]>) {
                    const nextOptions = (response.data ?? [])
                        .filter((item) => item.id !== currentMenuId)
                        .map((item) => ({
                            id: item.id ?? "",
                            label: `${item.code ?? "-"} - ${item.name ?? "-"}`,
                        }));

                    if (
                        currentParentId &&
                        !nextOptions.some((item) => item.id === currentParentId)
                    ) {
                        callGetParentMenu(
                            { id: currentParentId },
                            {
                                onSuccess(parentResponse: BaseResponse<MasterMenuInterface>) {
                                    const parent = parentResponse.data;

                                    setParentOptions(
                                        parent?.id
                                            ? [
                                                ...nextOptions,
                                                {
                                                    id: parent.id,
                                                    label: `${parent.code ?? "-"} - ${parent.name ?? "-"}`,
                                                },
                                            ]
                                            : nextOptions,
                                    );
                                },
                                onError() {
                                    setParentOptions(nextOptions);
                                },
                            },
                        );
                        return;
                    }

                    setParentOptions(nextOptions);
                },
                onError() {
                    parentRequestKeyRef.current = "";
                    setParentOptions([]);
                },
            },
        );
    }, [callGetParentMenu, callLoadMenu, currentMenuId, currentParentId, parentLevel]);

    useEffect(() => {
        loadParentOptions();
    }, [loadParentOptions]);

    useEffect(() => {
        if (selectedMenuLevel <= 1) {
            setParentOptions([]);
        }
    }, [selectedMenuLevel]);

    const field = (
        name: keyof MasterMenuInterface,
        label: string,
        placeholder: string,
        type = "text",
    ) => (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
                disabled={disabled}
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                value={(formik.values[name] as string | number) ?? ""}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched[name] ? (formik.errors[name] as string) : undefined}
            />
        </div>
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
                            {field("name", "Nama Menu", "Masukkan nama menu")}
                            {field("code", "Kode Menu", "Masukkan kode menu")}
                            {field("path_url", "Path URL", "Contoh: master/menu")}
                            {field("icon", "Icon", "Contoh: Settings")}
                            <div className="space-y-2">
                                <Label>Level Menu</Label>
                                <SharedDropdown
                                    disabled={disabled}
                                    id="menu_level"
                                    placeholder="Pilih level menu"
                                    value={String(formik.values.menu_level ?? "")}
                                    onValueChange={(value) => {
                                        formik.setFieldValue("menu_level", Number(value));
                                        formik.setFieldValue("parent_id", "");
                                        formik.setFieldTouched("menu_level");
                                    }}
                                    options={MENU_LEVEL_OPTIONS}
                                />
                                {formik.touched.menu_level && formik.errors.menu_level ? (
                                    <p className="text-xs text-red-500">{formik.errors.menu_level}</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <Label>Parent Menu</Label>
                                <SharedDropdown
                                    clearable={!disabled}
                                    disabled={disabled || selectedMenuLevel <= 1}
                                    id="parent_id"
                                    loading={loadingParent || loadingSelectedParent}
                                    placeholder={selectedMenuLevel <= 1 ? "Menu level 1 tidak memiliki parent" : "Pilih parent menu"}
                                    value={formik.values.parent_id ?? ""}
                                    onValueChange={(value) => {
                                        formik.setFieldValue("parent_id", value);
                                        formik.setFieldTouched("parent_id");
                                    }}
                                    options={parentOptions}
                                />
                                {formik.touched.parent_id && formik.errors.parent_id ? (
                                    <p className="text-xs text-red-500">{formik.errors.parent_id}</p>
                                ) : null}
                            </div>
                            {field("sort_order", "Urutan", "0", "number")}

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
                                        <RadioGroupItem value="true" id="menu_active" />
                                        <Label htmlFor="menu_active">Aktif</Label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="false" id="menu_inactive" />
                                        <Label htmlFor="menu_inactive">Tidak Aktif</Label>
                                    </div>
                                </RadioGroup>
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
