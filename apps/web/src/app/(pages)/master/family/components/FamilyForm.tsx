"use client";

import { SharedDropdown, type SharedDropdownOption } from "@/components/SharedDropdown";
import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import {
    FamilyMemberDialog,
    type SelectedFamilyMember,
} from "./FamilyMemberDialog";
import type {
    BaseResponse,
    BaseResponseDropdown,
    MasterFamilyInterface,
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
import {
    RadioGroup,
    RadioGroupItem,
} from "@monorepo/ui/components/radio-group";
import { useFormik } from "formik";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Yup from "yup";

export const familyValidationSchema = Yup.object({
    no_kk: Yup.string()
        .required("Nomor KK wajib diisi")
        .length(16, "Nomor KK harus 16 digit")
        .matches(/^\d+$/, "Nomor KK hanya boleh berisi angka"),
    no_pbb: Yup.string()
        .required("Nomor PBB wajib diisi")
        .length(18, "Nomor PBB harus 18 digit")
        .matches(/^\d+$/, "Nomor PBB hanya boleh berisi angka"),
    address: Yup.string().required("Alamat wajib diisi"),
});

type FamilyFormProps = {
    disabled?: boolean;
    initialValues: MasterFamilyInterface;
    loading?: boolean;
    onBack: () => void;
    onSubmit?: (values: MasterFamilyInterface) => Promise<void> | void;
    submitText?: string;
    title: string;
};

const defaultValues: MasterFamilyInterface = {
    no_kk: "",
    no_pbb: "",
    address: "",
    postal_code: "",
    status_adm: 1,
    status_dom: 1,
    is_active: true,
    member_id: "",
    member_ids: [],
    family_members: [],
};

export function FamilyForm({
    disabled = false,
    initialValues,
    loading = false,
    onBack,
    onSubmit,
    submitText = "Simpan",
    title,
}: FamilyFormProps) {
    const { callApi: callDropdownMember, loading: loadingMember } =
        useApiService("dropdownMember");
    const { callApi: callDropdownFamilyRelation, loading: loadingFamilyRelation } =
        useApiService("dropdownFamilyRelation");

    const [memberOptions, setMemberOptions] = useState<SharedDropdownOption[]>([]);
    const [familyRelationOptions, setFamilyRelationOptions] = useState<SharedDropdownOption[]>([]);
    const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<SelectedFamilyMember[]>([]);

    const resolvedInitialValues = useMemo(
        () => ({
            ...defaultValues,
            ...initialValues,
            family_members: initialValues.family_members ?? [],
            member_ids: initialValues.member_ids ?? [],
        }),
        [initialValues],
    );

    const formik = useFormik<MasterFamilyInterface>({
        initialValues: resolvedInitialValues,
        enableReinitialize: true,
        validateOnBlur: true,
        validateOnChange: true,
        validateOnMount: true,
        validationSchema: disabled ? undefined : familyValidationSchema,
        onSubmit: async (values) => {
            await onSubmit?.(values);
        },
    });

    const getRelationLabel = useCallback(
        (relation?: string | null) =>
            familyRelationOptions.find((item) => item.id === relation)?.label ?? relation ?? "",
        [familyRelationOptions],
    );

    const syncFormikMembers = useCallback(
        (members: SelectedFamilyMember[]) => {
            formik.setFieldValue("member_id", members[0]?.id ?? "");
            formik.setFieldValue("member_ids", members.map((item) => item.id));
            formik.setFieldValue(
                "family_members",
                members.map((item) => ({
                    member_id: item.id,
                    family_relation: item.family_relation,
                })),
            );
        },
        [formik],
    );

    const loadMemberOptions = useCallback(async () => {
        await callDropdownMember(
            { params: { unassignedOnly: true } },
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

    const loadFamilyRelationOptions = useCallback(async () => {
        await callDropdownFamilyRelation(
            {},
            {
                onSuccess(response: BaseResponse<BaseResponseDropdown[]>) {
                    setFamilyRelationOptions(
                        (response.data ?? []).map((item) => ({
                            id: item.value,
                            label: item.label,
                        })),
                    );
                },
            },
        );
    }, [callDropdownFamilyRelation]);

    useEffect(() => {
        loadFamilyRelationOptions();
        if (!disabled) {
            loadMemberOptions();
        }
    }, [disabled, loadFamilyRelationOptions, loadMemberOptions]);

    useEffect(() => {
        const nextMembers = (resolvedInitialValues.family_members ?? []).map((member) => ({
            id: member.member_id,
            label: member.member_name ?? member.member_id,
            nik: member.member_nik,
            family_relation: member.family_relation ?? "",
            family_relation_label: getRelationLabel(member.family_relation),
        }));
        setSelectedMembers(nextMembers);
    }, [getRelationLabel, resolvedInitialValues.family_members]);

    const handleOpenMemberDialog = useCallback(() => {
        setIsMemberDialogOpen(true);
        loadMemberOptions();
        loadFamilyRelationOptions();
    }, [loadFamilyRelationOptions, loadMemberOptions]);

    const handleAddMember = useCallback((selectedMember: SelectedFamilyMember) => {
        const nextMembers: SelectedFamilyMember[] = [
            ...selectedMembers,
            selectedMember,
        ];

        setSelectedMembers(nextMembers);
        syncFormikMembers(nextMembers);
    }, [selectedMembers, syncFormikMembers]);

    const handleRemoveMember = useCallback(
        (memberId: string) => {
            const nextMembers = selectedMembers.filter((item) => item.id !== memberId);
            setSelectedMembers(nextMembers);
            syncFormikMembers(nextMembers);
        },
        [selectedMembers, syncFormikMembers],
    );

    const loadingMemberTable = loading || loadingFamilyRelation;

    return (
        <>
            <div className="mt-6">
                <form onSubmit={formik.handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(
                                    [
                                        ["no_kk", "No KK"],
                                        ["no_pbb", "No PBB"],
                                        ["address", "Alamat"],
                                        ["postal_code", "Kode Pos"],
                                    ] as Array<[keyof MasterFamilyInterface, string]>
                                ).map(([id, label]) => (
                                    <div className="space-y-2" key={id}>
                                        <Label htmlFor={id}>{label}</Label>
                                        <Input
                                            disabled={disabled}
                                            id={id}
                                            name={id}
                                            value={(formik.values[id] as string) ?? ""}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            error={
                                                formik.touched[id]
                                                    ? (formik.errors[id] as string)
                                                    : undefined
                                            }
                                        />
                                    </div>
                                ))}

                                <div className="space-y-2">
                                    <Label>Status Administrasi</Label>
                                    <RadioGroup
                                        disabled={disabled}
                                        value={String(formik.values.status_adm)}
                                        onValueChange={(value) => {
                                            formik.setFieldValue("status_adm", Number(value));
                                        }}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="1" id="status_adm_aktif" />
                                            <Label htmlFor="status_adm_aktif">Aktif</Label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="0" id="status_adm_tidak_aktif" />
                                            <Label htmlFor="status_adm_tidak_aktif">Tidak Aktif</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label>Status Domisili</Label>
                                    <RadioGroup
                                        disabled={disabled}
                                        value={String(formik.values.status_dom)}
                                        onValueChange={(value) => {
                                            formik.setFieldValue("status_dom", Number(value));
                                        }}
                                        className="flex gap-6"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="1" id="status_dom_aktif" />
                                            <Label htmlFor="status_dom_aktif">Aktif</Label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="0" id="status_dom_tidak_aktif" />
                                            <Label htmlFor="status_dom_tidak_aktif">Tidak Aktif</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </form>

                {
                    !loading && (
                        <Card className="mt-6">
                            <CardContent className="">
                                {/* <div > */}
                                <CardHeader className="px-0 mb-6 flex items-center justify-between">
                                    <CardTitle>{title}</CardTitle>
                                    {!disabled && (
                                        <Button
                                            type="button"
                                            onClick={handleOpenMemberDialog}
                                            variant="outline"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Tambah Anggota
                                        </Button>
                                    )}
                                </CardHeader>

                                {/* </div> */}

                                <AppDataTable
                                    data={selectedMembers}
                                    loading={loadingMemberTable}
                                    showMeta={false}
                                    columns={[
                                        { field: "label", header: "Nama" },
                                        { field: "nik", header: "NIK" },
                                        { field: "family_relation_label", header: "Hubungan Keluarga" },
                                        { field: "id", header: "ID Member" },
                                        ...(!disabled
                                            ? [
                                                {
                                                    header: "Aksi",
                                                    body: (row: SelectedFamilyMember) => (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveMember(row.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    ),
                                                },
                                            ]
                                            : []),
                                    ]}
                                    onMetaChange={() => { }}
                                />
                            </CardContent>
                        </Card>
                    )
                }

                <Card className="mt-6">
                    <CardContent className="mt-6">
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onBack}>
                                {disabled ? "Kembali" : "Batal"}
                            </Button>
                            {!disabled ? (
                                <Button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => formik.handleSubmit()}
                                >
                                    {loading ? "Menyimpan..." : submitText}
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <FamilyMemberDialog
                familyRelationOptions={familyRelationOptions}
                loadingFamilyRelation={loadingFamilyRelation}
                loadingMember={loadingMember}
                memberOptions={memberOptions}
                open={isMemberDialogOpen}
                selectedMembers={selectedMembers}
                onAddMember={handleAddMember}
                onOpenChange={setIsMemberDialogOpen}
            />
        </>
    );
}
