"use client";

import React, { useState, useEffect, useCallback } from "react";
// import { Button } from "primereact/button";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Column } from "primereact/column";
import type { BaseResponse, MasterRoleInterface, Metadata } from "@monorepo/types";
import { useApiService } from "@/hooks";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { EllipsisVertical, PencilLine, PencilLineIcon, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@monorepo/ui/components/dropdown-menu";
import { Button } from "@monorepo/ui/components/button";
import { Paginator, type PaginatorPageChangeEvent } from 'primereact/paginator';
import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { Label } from "@monorepo/ui/components/label";
import { Input } from "@monorepo/ui/components/input";
import { useFormik } from "formik";

export default function PageContent() {
    const [listData, setListData] = useState<MasterRoleInterface[]>([]);

    const [meta, setMeta] = useState<Metadata>({
        page: 1,
        pageSize: 5,
        total: 0,
    });

    const [filterParams, setFilterParams] =
        useState<Partial<MasterRoleInterface>>({});
    const { callApi: callRoleDataList, loading: loadingRoleDataList } =
        useApiService("loadDataRole");

    /**
     * 🔥 Fetch Data
     */
    const handleGetList = useCallback(
        async (params: Partial<MasterRoleInterface>, pagination: Metadata) => {
            await callRoleDataList(
                {
                    params,
                    metadata: pagination,
                },
                {
                    onSuccess(response) {
                        setListData(response.data ?? []);
                        setMeta((prev) => ({
                            ...prev,
                            total: response.metaData?.total ?? 0,
                        }));
                    },
                    onError(error) {
                        console.error("loadDataRole error:", error);
                    },
                }
            );
        },
        [callRoleDataList]
    );

    /**
     * 🔥 Initial Load & Refetch on meta change
     */
    useEffect(() => {
        handleGetList(filterParams, meta);
    }, [meta.page, meta.pageSize]);

    function handleNavigation(type: string, item: any | null) {
        console.info(item.id)
    }
    const formik = useFormik<Partial<MasterRoleInterface>>({
        initialValues: { name: "", code: "" },
        onSubmit: (values) => {
            setFilterParams(values);
            setMeta((prev) => ({ ...prev, page: 1 }));
        },
    });

    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    return (
        <div className="mt-6">
            <Card>
                <CardContent>
                    <h1 className="text-2xl font-bold my-4">Role Management</h1>
                    <p className="text-gray-600">
                        Di halaman ini, Anda dapat mengelola data role pengguna.
                    </p>
                </CardContent>
            </Card>

            <FilterPanel
                title="Cari Data Role"
                columns={2}
                onSubmit={formik.submitForm}
                onReset={() => {
                    formik.resetForm();
                    setFilterParams({});
                }}
            >
                <div>
                    <Label>Nama Role</Label>
                    <Input
                        className="w-full mt-2"
                        name="name"
                        value={formik.values.name ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan nama role"
                    />
                </div>
                <div>
                    <Label>Kode</Label>
                    <Input
                        className="w-full mt-2"
                        name="code"
                        value={formik.values.code ?? ""}
                        onChange={formik.handleChange}
                        placeholder="Masukkan kode role"
                    />
                </div>
            </FilterPanel>
            <Card className="mt-6">
                <CardContent className="pt-6">
                    <Button
                        onClick={() => { }}
                        variant={"outline"}
                    >
                        <Plus />
                        Tambah Data
                    </Button>
                    <AppDataTable
                        meta={meta}
                        data={listData}
                        loading={loadingRoleDataList}
                        // totalRecords={}
                        first={first}
                        rows={rows}
                        onPageChange={(e: any) => {
                            setFirst(e.first);
                            setRows(e.rows);

                            setMeta((prev) => ({
                                ...prev,
                                page: e.page + 1,
                                pageSize: e.rows,
                            }));
                        }}
                        onEdit={(row: any) => handleNavigation("UPDATE", row)}
                        onDelete={(row: any) => handleNavigation("DELETE", row)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}