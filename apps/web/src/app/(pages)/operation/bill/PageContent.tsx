"use client";

import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import type { IplBillInterface, Metadata } from "@monorepo/types";
import { Badge } from "@monorepo/ui/components/badge";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const money = (value?: number | null) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function PageContent() {
  const [data, setData] = useState<IplBillInterface[]>([]);
  const [meta, setMeta] = useState<Metadata>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const { callApi, loading } = useApiService("loadMyIplBill");
  const load = useCallback(
    () =>
      callApi(
        { params: {}, metadata: meta },
        {
          onSuccess: (response) => {
            setData(response.data || []);
            setMeta((old) => ({
              ...old,
              total: response.metaData?.total || 0,
            }));
          },
        },
      ),
    [callApi, meta.page, meta.pageSize, meta.sortBy, meta.sortDir],
  );
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-6 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">Tagihan IPL</h1>
        <p className="mt-1 text-sm text-slate-500">
          Daftar tagihan IPL untuk keluarga Anda.
        </p>
      </div>
      {data.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-slate-300 bg-white py-16 text-center">
          <ReceiptText className="h-10 w-10 text-slate-400" />
          <div>
            <p className="font-medium text-slate-700">Belum ada tagihan</p>
            <p className="text-sm text-slate-500">
              Tagihan baru akan muncul setelah diterbitkan pengelola.
            </p>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <AppDataTable
              data={data}
              loading={loading}
              meta={meta}
              onMetaChange={setMeta}
              columns={[
                {
                  field: "bill_number",
                  header: "Nomor Tagihan",
                  sortable: true,
                },
                { field: "period", header: "Periode", sortable: true },
                {
                  field: "amount",
                  header: "Nominal",
                  body: (row) => money(row.amount),
                },
                {
                  field: "status",
                  header: "Status",
                  body: (row) => (
                    <Badge
                      className={
                        row.status === "UNPAID"
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-100 text-slate-600"
                      }
                    >
                      {row.status}
                    </Badge>
                  ),
                },
                { field: "note", header: "Catatan" },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
