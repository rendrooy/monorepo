"use client";

import { AppDataTable } from "@/components/DataTable";
import { formatCurrency } from "@/lib/homehub-format";
import { useApiService } from "@/hooks";
import type { IplSettingInterface, Metadata } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { useFormik } from "formik";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function PageContent() {
    const [listData, setListData] = useState<IplSettingInterface[]>([]);
    const [meta, setMeta] = useState<Metadata>({ page: 1, pageSize: 10, total: 0 });
    const { callApi: callList, loading } = useApiService("loadDataIplSetting");
    const { callApi: callCreate, loading: saving } = useApiService("insertDataIplSetting");
    const formik = useFormik<IplSettingInterface>({
        initialValues: { name: "Tarif IPL Bulanan", monthly_amount: 0, due_day: 10, is_active: true },
        onSubmit: () => { handleSubmit(); },
    });

    const load = useCallback(() => {
        callList({ params: {}, metadata: meta }, {
            onSuccess(response) {
                setListData(response.data ?? []);
                setMeta((prev) => ({ ...prev, total: (response as any).metaData?.total ?? 0 }));
            },
        });
    }, [callList, meta.page, meta.pageSize, meta.sortBy, meta.sortDir]);

    const handleSubmit = useCallback(async () => {
        await callCreate(formik.values, {
            onSuccess(response) {
                toast.success(response.message);
                load();
            },
        });
    }, [callCreate, formik.values, load]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="mt-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Setting IPL</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={formik.handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label>Nama Setting</Label>
                            <Input className="mt-2" id="name" value={formik.values.name ?? ""} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Tarif Bulanan</Label>
                            <Input className="mt-2" id="monthly_amount" type="number" value={formik.values.monthly_amount ?? 0} onChange={formik.handleChange} />
                        </div>
                        <div>
                            <Label>Jatuh Tempo Tanggal</Label>
                            <Input className="mt-2" id="due_day" type="number" min={1} max={31} value={formik.values.due_day ?? 10} onChange={formik.handleChange} />
                        </div>
                        <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Setting"}</Button>
                    </form>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="pt-6">
                    <AppDataTable
                        columns={[
                            { field: "name", header: "Nama" },
                            { field: "monthly_amount", header: "Tarif", body: (row) => formatCurrency(row.monthly_amount) },
                            { field: "due_day", header: "Jatuh Tempo" },
                            { field: "is_active", header: "Aktif", body: (row) => row.is_active ? "Ya" : "Tidak" },
                        ]}
                        data={listData}
                        loading={loading}
                        meta={meta}
                        onMetaChange={setMeta}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
