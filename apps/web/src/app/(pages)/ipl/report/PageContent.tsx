"use client";

import { AppDataTable } from "@/components/DataTable";
import { FilterPanel } from "@/components/FilterPanel";
import { IplStatusBadge } from "@/components/IplStatusBadge";
import { useApiService } from "@/hooks";
import { formatDateTime } from "@/utils/format-date";
import { getAuthMenu } from "@/utils/auth-storage";
import { canAccessRoute } from "@/utils/permission";
import type {
  IplBillInterface,
  IplCreditLedgerInterface,
  IplReportSummaryInterface,
  Metadata,
} from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import {
  Banknote,
  Download,
  ReceiptText,
  Scale,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const money = (value?: number | null) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const initialSummary: IplReportSummaryInterface = {
  total_billed: 0,
  cash_received: 0,
  recognized_income: 0,
  outstanding_amount: 0,
  pending_payment_amount: 0,
  family_credit_balance: 0,
  total_bill_count: 0,
  paid_bill_count: 0,
};
const csvCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function PageContent() {
  const authMenu = useMemo(() => getAuthMenu(), []);
  const canDownload = useMemo(
    () => canAccessRoute(authMenu, "ipl/report", "DOWNLOAD"),
    [authMenu],
  );
  const [summary, setSummary] = useState(initialSummary);
  const [view, setView] = useState<"bill" | "credit">("bill");
  const [bills, setBills] = useState<IplBillInterface[]>([]);
  const [credits, setCredits] = useState<IplCreditLedgerInterface[]>([]);
  const [filter, setFilter] = useState({ period: "", family_no_kk: "" });
  const [appliedFilter, setAppliedFilter] = useState(filter);
  const [meta, setMeta] = useState<Metadata>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const { callApi: getSummary } = useApiService("getIplReportSummary");
  const { callApi: loadBills, loading: loadingBills } =
    useApiService("loadIplBill");
  const { callApi: loadCredits, loading: loadingCredits } = useApiService(
    "loadIplCreditLedger",
  );

  const reload = useCallback(() => {
    getSummary(appliedFilter, {
      onSuccess: (response) => response.data && setSummary(response.data),
    });
    if (view === "bill") {
      loadBills(
        {
          params: {
            period: appliedFilter.period || undefined,
            family_no_kk: appliedFilter.family_no_kk || undefined,
          },
          metadata: meta,
        },
        {
          onSuccess: (response) => {
            setBills(response.data || []);
            setMeta((old) => ({
              ...old,
              total: response.metaData?.total || 0,
            }));
          },
        },
      );
    } else {
      loadCredits(
        {
          params: { family_no_kk: appliedFilter.family_no_kk || undefined },
          metadata: meta,
        },
        {
          onSuccess: (response) => {
            setCredits(response.data || []);
            setMeta((old) => ({
              ...old,
              total: response.metaData?.total || 0,
            }));
          },
        },
      );
    }
  }, [
    appliedFilter,
    getSummary,
    loadBills,
    loadCredits,
    meta.page,
    meta.pageSize,
    meta.sortBy,
    meta.sortDir,
    view,
  ]);
  useEffect(() => {
    reload();
  }, [reload]);

  const downloadCsv = () => {
    const rows =
      view === "bill"
        ? [
          [
            "Nomor Tagihan",
            "Periode",
            "No KK",
            "Nominal",
            "Dibayar",
            "Sisa",
            "Status",
          ],
          ...bills.map((bill) => [
            bill.bill_number,
            bill.period,
            bill.family_no_kk,
            bill.amount,
            bill.paid_amount,
            bill.remaining_amount,
            bill.status,
          ]),
        ]
        : [
          ["Waktu", "No KK", "Tagihan", "Tipe", "Perubahan", "Saldo"],
          ...credits.map((credit) => [
            credit.created_time,
            credit.family_no_kk,
            credit.bill_number,
            credit.transaction_type,
            credit.amount,
            credit.balance_after,
          ]),
        ];
    const blob = new Blob(
      [rows.map((row) => row.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-ipl-${view}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Laporan berhasil diunduh");
  };

  const metrics = [
    {
      label: "Total Tagihan",
      value: money(summary.total_billed),
      icon: ReceiptText,
    },
    {
      label: "Kas Diterima",
      value: money(summary.cash_received),
      icon: Banknote,
    },
    {
      label: "Pendapatan Teralokasi",
      value: money(summary.recognized_income),
      icon: Scale,
    },
    {
      label: "Piutang",
      value: money(summary.outstanding_amount),
      icon: WalletCards,
    },
    {
      label: "Payment Pending",
      value: money(summary.pending_payment_amount),
      icon: ReceiptText,
    },
    {
      label: "Saldo Kredit Keluarga",
      value: money(summary.family_credit_balance),
      icon: WalletCards,
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan IPL</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan tagihan, penerimaan, piutang, dan pergerakan saldo kredit.
          </p>
        </div>
        {canDownload ? (
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        ) : null}
      </div>
      <FilterPanel
        columns={2}
        onSubmit={() => {
          setMeta((old) => ({ ...old, page: 1 }));
          setAppliedFilter(filter);
        }}
        onReset={() => {
          const empty = { period: "", family_no_kk: "" };
          setFilter(empty);
          setAppliedFilter(empty);
        }}
      >
        <div>
          <Label>Periode</Label>
          <Input
            className="mt-2"
            placeholder="Contoh: JUL-2026"
            value={filter.period}
            onChange={(event) =>
              setFilter((old) => ({
                ...old,
                period: event.target.value.toUpperCase(),
              }))
            }
          />
        </div>
        <div>
          <Label>No. KK</Label>
          <Input
            className="mt-2"
            value={filter.family_no_kk}
            onChange={(event) =>
              setFilter((old) => ({ ...old, family_no_kk: event.target.value }))
            }
          />
        </div>
      </FilterPanel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-24 items-center gap-4 rounded-md border border-slate-200 bg-white p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
              <Icon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="text-sm text-slate-500">{label}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
        <Button
          size="sm"
          variant={view === "bill" ? "default" : "ghost"}
          onClick={() => {
            setView("bill");
            setMeta({ page: 1, pageSize: 10, total: 0 });
          }}
        >
          Detail Tagihan
        </Button>
        <Button
          size="sm"
          variant={view === "credit" ? "default" : "ghost"}
          onClick={() => {
            setView("credit");
            setMeta({ page: 1, pageSize: 10, total: 0 });
          }}
        >
          Ledger Kredit
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          {view === "bill" ? (
            <AppDataTable
              data={bills}
              loading={loadingBills}
              meta={meta}
              onMetaChange={setMeta}
              columns={[
                { field: "bill_number", header: "Tagihan" },
                { field: "period", header: "Periode" },
                { field: "family_no_kk", header: "No. KK" },
                {
                  field: "amount",
                  header: "Nominal",
                  body: (row) => money(row.amount),
                },
                {
                  field: "paid_amount",
                  header: "Teralokasi",
                  body: (row) => money(row.paid_amount),
                },
                {
                  field: "remaining_amount",
                  header: "Sisa",
                  body: (row) => money(row.remaining_amount),
                },
                {
                  field: "status",
                  header: "Status",
                  body: (row) => <IplStatusBadge status={row.status} />,
                },
              ]}
            />
          ) : (
            <AppDataTable
              data={credits}
              loading={loadingCredits}
              meta={meta}
              onMetaChange={setMeta}
              columns={[
                { field: "created_time", header: "Waktu", body: (row) => formatDateTime(row.created_time) },
                { field: "family_no_kk", header: "No. KK" },
                { field: "bill_number", header: "Tagihan" },
                { field: "transaction_type", header: "Tipe" },
                {
                  field: "amount",
                  header: "Perubahan",
                  body: (row) => money(row.amount),
                },
                {
                  field: "balance_after",
                  header: "Saldo Setelah",
                  body: (row) => money(row.balance_after),
                },
                { field: "note", header: "Catatan" },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
