"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface FinancialTrendPoint {
  label: string;
  total_billed: number;
  recognized_income: number;
  cash_received: number;
}

interface Props {
  data: FinancialTrendPoint[];
  showTotalBilled?: boolean;
  showCashReceived?: boolean;
}

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const compactMoney = (value: number) => value >= 1_000_000 ? `${Math.round(value / 1_000_000)} jt` : value >= 1_000 ? `${Math.round(value / 1_000)} rb` : String(value);

export function FinancialTrendChart({ data, showTotalBilled = true, showCashReceived = true }: Readonly<Props>) {
  return <div className="w-full overflow-x-auto pb-2"><div className="h-80 min-w-[640px]">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 20, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} width={54} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={compactMoney} />
        <Tooltip formatter={(value) => money(Number(value || 0))} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 8px 20px rgba(15,23,42,.08)" }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="recognized_income" name="Pendapatan Teralokasi" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={36} />
        {showTotalBilled ? <Line dataKey="total_billed" name="Total Tagihan" type="monotone" stroke="#475569" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} /> : null}
        {showCashReceived ? <Line dataKey="cash_received" name="Kas Diterima" type="monotone" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  </div></div>;
}
