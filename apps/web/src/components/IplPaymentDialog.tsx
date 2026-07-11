"use client";

import type { IplBillInterface, IplPaymentInterface, IplPaymentMethod } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@monorepo/ui/components/dialog";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@monorepo/ui/components/select";
import { Textarea } from "@monorepo/ui/components/textarea";
import { FileCheck2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  bills: IplBillInterface[];
  selectedBill?: IplBillInterface | null;
  adminMode?: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payment: IplPaymentInterface) => Promise<void> | void;
}

const MAX_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const money = (value?: number | null) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));

const readFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => reject(new Error("File tidak dapat dibaca"));
  reader.readAsDataURL(file);
});

export function IplPaymentDialog({ open, bills, selectedBill, adminMode = false, loading = false, onOpenChange, onSubmit }: Readonly<Props>) {
  const [billId, setBillId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState<IplPaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setBillId(selectedBill?.id || "");
    setAmount(selectedBill?.remaining_amount ? String(selectedBill.remaining_amount) : "");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod("BANK_TRANSFER");
    setReference("");
    setNote("");
    setFile(null);
  }, [open, selectedBill]);

  const bill = useMemo(() => bills.find((item) => item.id === billId) || selectedBill || null, [billId, bills, selectedBill]);

  const handleFile = (next?: File) => {
    if (!next) { setFile(null); return; }
    if (!allowedTypes.has(next.type)) { toast.error("Bukti hanya boleh JPEG, PNG, atau PDF"); return; }
    if (next.size > MAX_SIZE) { toast.error("Ukuran bukti maksimal 5 MB"); return; }
    setFile(next);
  };

  const submit = async () => {
    if (!bill?.id || !amount || Number(amount) <= 0 || !paymentDate || !file) {
      toast.error("Tagihan, nominal, tanggal, dan bukti pembayaran wajib diisi");
      return;
    }
    const proofData = await readFile(file);
    await onSubmit({
      bill_id: bill.id,
      family_id: bill.family_id,
      amount: Number(amount),
      payment_date: paymentDate,
      payment_method: method,
      reference_number: reference,
      note,
      proof_data: proofData,
      proof_original_name: file.name,
      proof_mime_type: file.type,
      proof_size: file.size,
    });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
    <DialogHeader><DialogTitle>{adminMode ? "Catat Pembayaran Warga" : "Upload Bukti Pembayaran"}</DialogTitle><DialogDescription>{adminMode ? "Pembayaran yang dicatat admin langsung disetujui." : "Pembayaran akan diperiksa oleh admin sebelum mengurangi tagihan."}</DialogDescription></DialogHeader>
    <div className="space-y-4">
      {adminMode ? <div className="space-y-2"><Label>Tagihan</Label><Select value={billId} onValueChange={setBillId}><SelectTrigger><SelectValue placeholder="Pilih tagihan" /></SelectTrigger><SelectContent>{bills.map((item) => <SelectItem key={item.id} value={item.id!}>{item.bill_number} - {item.family_no_kk} - {money(item.remaining_amount)}</SelectItem>)}</SelectContent></Select></div> : null}
      {bill ? <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"><div><span className="text-slate-500">Tagihan</span><div className="font-medium">{bill.bill_number}</div></div><div><span className="text-slate-500">Sisa</span><div className="font-medium">{money(bill.remaining_amount)}</div></div></div> : null}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="payment_amount">Nominal</Label><Input id="payment_amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="payment_date">Tanggal Pembayaran</Label><Input id="payment_date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div></div>
      <div className="space-y-2"><Label>Metode Pembayaran</Label><Select value={method} onValueChange={(value) => setMethod(value as IplPaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BANK_TRANSFER">Transfer Bank</SelectItem><SelectItem value="CASH">Tunai</SelectItem><SelectItem value="OTHER">Lainnya</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="reference_number">Nomor Referensi</Label><Input id="reference_number" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Opsional" /></div>
      <div className="space-y-2"><Label htmlFor="payment_note">Catatan</Label><Textarea id="payment_note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opsional" /></div>
      <div className="space-y-2"><Label htmlFor="payment_proof">Bukti Pembayaran</Label><label htmlFor="payment_proof" className="flex min-h-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:bg-slate-100">{file ? <span className="flex items-center gap-2 text-sm text-slate-700"><FileCheck2 className="h-5 w-5 text-emerald-600" />{file.name}</span> : <span className="flex flex-col items-center gap-1 text-sm text-slate-500"><Upload className="h-5 w-5" />Pilih JPEG, PNG, atau PDF (maks. 5 MB)</span>}</label><Input id="payment_proof" className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => handleFile(event.target.files?.[0])} /></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button disabled={loading} onClick={submit}>{loading ? "Menyimpan..." : adminMode ? "Catat Pembayaran" : "Kirim Bukti"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
