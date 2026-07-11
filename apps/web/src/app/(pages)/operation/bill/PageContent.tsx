"use client";

import { AppDataTable } from "@/components/DataTable";
import { useApiService } from "@/hooks";
import { IplPaymentDialog } from "@/components/IplPaymentDialog";
import { getAccessToken } from "@/utils/auth-storage";
import type { IplBillInterface, IplPaymentInterface, Metadata } from "@monorepo/types";
import { Badge } from "@monorepo/ui/components/badge";
import { Button } from "@monorepo/ui/components/button";
import { Card, CardContent } from "@monorepo/ui/components/card";
import { Eye, ReceiptText, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const money = (value?: number | null) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function PageContent() {
  const [data, setData] = useState<IplBillInterface[]>([]);
  const [payments, setPayments] = useState<IplPaymentInterface[]>([]);
  const [selectedBill, setSelectedBill] = useState<IplBillInterface | null>(null);
  const [meta, setMeta] = useState<Metadata>({
    page: 1,
    pageSize: 10,
    total: 0,
  });
  const { callApi, loading } = useApiService("loadMyIplBill");
  const { callApi: loadPayments } = useApiService("loadMyIplPayment");
  const { callApi: createPayment, loading: creatingPayment } = useApiService("createIplPayment");
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

  const refreshPayments = useCallback(() => {
    loadPayments({ params: {}, metadata: { page: 1, pageSize: 100 } }, { onSuccess: (response) => setPayments(response.data || []) });
  }, [loadPayments]);

  useEffect(() => { refreshPayments(); }, [refreshPayments]);

  const submitPayment = async (payment: IplPaymentInterface) => {
    await createPayment(payment, {
      onSuccess: () => { toast.success("Bukti pembayaran berhasil dikirim"); setSelectedBill(null); load(); refreshPayments(); },
      onError: (error) => toast.error(error.message || "Bukti pembayaran gagal dikirim"),
    });
  };

  const openProof = async (payment: IplPaymentInterface) => {
    const response = await fetch(`http://localhost:3001/v1/operation/ipl/payment/${payment.id}/proof`, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    if (!response.ok) { toast.error("Bukti pembayaran tidak dapat dibuka"); return; }
    window.open(URL.createObjectURL(await response.blob()), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">Tagihan</h1>
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
                { field: "paid_amount", header: "Dibayar", body: (row) => money(row.paid_amount) },
                { field: "remaining_amount", header: "Sisa", body: (row) => money(row.remaining_amount) },
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
                { header: "Aksi", body: (row) => <Button size="sm" variant="outline" disabled={row.status === "PAID" || row.status === "OVERPAID" || row.status === "CANCELLED" || Number(row.pending_payment_count) > 0} onClick={() => setSelectedBill(row)}><Upload className="h-4 w-4" />{Number(row.pending_payment_count) > 0 ? "Menunggu Verifikasi" : "Upload Bukti"}</Button> },
              ]}
            />
          </CardContent>
        </Card>
      )}
      <Card><CardContent className="pt-6"><h2 className="mb-4 text-lg font-semibold">Riwayat Pembayaran</h2><AppDataTable data={payments} showMeta={false} onMetaChange={() => undefined} columns={[
        { field: "bill_number", header: "Tagihan" }, { field: "payment_date", header: "Tanggal" },
        { field: "amount", header: "Nominal", body: (row) => money(row.amount) },
        { field: "payment_method", header: "Metode" },
        { field: "status", header: "Status", body: (row) => <Badge className={row.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : row.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}>{row.status}</Badge> },
        { field: "rejection_note", header: "Catatan Admin", body: (row) => row.rejection_note || row.reversal_note || "-" },
        { header: "Bukti", body: (row) => <Button size="icon" variant="ghost" title="Lihat bukti" onClick={() => openProof(row)}><Eye className="h-4 w-4" /></Button> },
      ]} /></CardContent></Card>
      <IplPaymentDialog open={selectedBill !== null} bills={data} selectedBill={selectedBill} loading={creatingPayment} onOpenChange={(open) => !open && setSelectedBill(null)} onSubmit={submitPayment} />
    </div>
  );
}
