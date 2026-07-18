"use client";

import SwalDialog from "@/components/ConfirmationDialog";
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { MESSAGES } from "@/constants";
import { useApiService } from "@/hooks";
import { getAuthMenu } from "@/utils/auth-storage";
import { formatDateTime } from "@/utils/format-date";
import { canAccessRoute } from "@/utils/permission";
import type { MasterUserInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@monorepo/ui/components/dropdown-menu";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { CheckCircle2, EllipsisVertical, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type RegistrationAction = "APPROVE" | "REJECT";

export default function PageContent() {
    const operationPath = "operation/user-registration";
    const authMenu = useMemo(() => getAuthMenu(), []);
    const canAction = useMemo(() => canAccessRoute(authMenu, operationPath, "ACTION"), [authMenu]);
    const [selectedItem, setSelectedItem] = useState<MasterUserInterface>();
    const [selectedAction, setSelectedAction] = useState<RegistrationAction | null>(null);
    const [listData, setListData] = useState<MasterUserInterface[]>([]);
    const [filterParams, setFilterParams] = useState<Partial<MasterUserInterface>>({});
    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 10,
        total: 0,
    });

    const { callApi: callLoad, loading: loadingLoad } =
        useApiService("loadDataUserRegistration");
    const { callApi: callApprove, loading: loadingApprove } =
        useApiService("approveDataUserRegistration");
    const { callApi: callReject, loading: loadingReject } =
        useApiService("rejectDataUserRegistration");

    const filterForm = useFormik<MasterUserInterface>({
        initialValues: {
            username: "",
            email: "",
            member_nik: "",
        },
        onSubmit: () => { },
    });

    const handleGetList = useCallback(
        async (params: Partial<MasterUserInterface>, pagination: Metadata) => {
            await callLoad(
                { params, metadata: pagination },
                {
                    onSuccess(response) {
                        setListData(response.data ?? []);
                        setMeta((prev) => ({
                            ...prev,
                            total: response.metaData?.total ?? 0,
                        }));
                    },
                    onError() {
                        toast.error(MESSAGES.ERROR.GENERAL);
                    },
                },
            );
        },
        [callLoad],
    );

    const openActionDialog = (action: RegistrationAction, item: MasterUserInterface) => {
        if (!canAction) {
            toast.error("Anda tidak memiliki akses untuk memproses registrasi user.");
            return;
        }

        setSelectedAction(action);
        setSelectedItem(item);
    };

    const handleConfirmAction = async () => {
        if (!selectedItem?.id || !selectedAction) {
            return;
        }

        if (selectedAction === "APPROVE") {
            await callApprove(
                { id: selectedItem.id },
                {
                    onSuccess() {
                        toast.success("Registrasi user berhasil disetujui.");
                        handleGetList(filterParams, meta);
                    },
                    onError(error) {
                        toast.error(error?.message || MESSAGES.ERROR.UPDATE);
                    },
                },
            );
        } else {
            const rejectionNote = window.prompt("Masukkan alasan penolakan") ?? "";
            await callReject(
                {
                    id: selectedItem.id,
                    rejection_note: rejectionNote,
                },
                {
                    onSuccess() {
                        toast.success("Registrasi user berhasil ditolak.");
                        handleGetList(filterParams, meta);
                    },
                    onError(error) {
                        toast.error(error?.message || MESSAGES.ERROR.UPDATE);
                    },
                },
            );
        }

        setSelectedAction(null);
        setSelectedItem(undefined);
    };

    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize, meta.sortBy, meta.sortDir, filterParams, handleGetList]);

    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Registrasi User</h1>
                    <p className="text-gray-600">
                        Kelola persetujuan akun user dari aplikasi warga.
                    </p>
                </CardContent>
            </Card>

            <FilterPanel
                columns={3}
                onSubmit={() => {
                    if (filterForm.values.member_nik && !/^\d{16}$/.test(filterForm.values.member_nik)) {
                        toast.error("Filter NIK harus tepat 16 digit");
                        return;
                    }
                    setFilterParams(filterForm.values);
                }}
                onReset={() => {
                    filterForm.resetForm();
                    setFilterParams({});
                }}
            >
                <div>
                    <Label>Username</Label>
                    <Input
                        id="username"
                        className="mt-2"
                        value={filterForm.values.username ?? ""}
                        placeholder="Masukkan username"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>Email</Label>
                    <Input
                        id="email"
                        className="mt-2"
                        value={filterForm.values.email ?? ""}
                        placeholder="Masukkan email"
                        onChange={filterForm.handleChange}
                    />
                </div>
                <div>
                    <Label>NIK</Label>
                    <Input
                        id="member_nik"
                        className="mt-2"
                        value={filterForm.values.member_nik ?? ""}
                        placeholder="Masukkan 16 digit NIK"
                        onChange={filterForm.handleChange}
                    />
                </div>
            </FilterPanel>

            <Card className="mt-6">
                <CardContent className="pt-6">
                    <AppDataTable
                        columns={[
                            { field: "username", header: "Username", skeletonWidth: "60%" },
                            { field: "email", header: "Email", skeletonWidth: "80%" },
                            { field: "member_name", header: "Nama Warga", skeletonWidth: "80%" },
                            { field: "member_nik", header: "NIK", skeletonWidth: "80%" },
                            // { field: "role_name", header: "Role", skeletonWidth: "70%" },
                            {
                                field: "created_time",
                                header: "Tanggal Request",
                                body: (row) =>
                                    formatDateTime(row.created_time),
                            },
                            {
                                header: "Aksi",
                                body: (row) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <EllipsisVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => openActionDialog("APPROVE", row)}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Setujui
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-500"
                                                onClick={() => openActionDialog("REJECT", row)}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Tolak
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ),
                            },
                        ]}
                        data={listData}
                        loading={loadingLoad}
                        meta={meta}
                        onMetaChange={setMeta}
                    />
                </CardContent>
            </Card>

            <SwalDialog
                open={selectedAction !== null}
                isLoading={loadingApprove || loadingReject}
                title={selectedAction === "APPROVE" ? "Setujui Registrasi?" : "Tolak Registrasi?"}
                message={
                    selectedAction === "APPROVE"
                        ? "User akan aktif dan dapat login ke aplikasi."
                        : "User akan ditandai sebagai rejected dan tidak dapat login."
                }
                variant={selectedAction === "APPROVE" ? "info" : "warning"}
                confirmText={selectedAction === "APPROVE" ? "Setujui" : "Tolak"}
                cancelText="Batal"
                onCancel={() => {
                    setSelectedAction(null);
                    setSelectedItem(undefined);
                }}
                onConfirm={handleConfirmAction}
            />
        </div>
    );
}
