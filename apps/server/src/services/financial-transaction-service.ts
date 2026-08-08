import type { PoolClient } from "pg";
import { tableNames } from "../config";
import { getCurrentAuth } from "../utils/request-context";
import { addTenantScope, getCurrentTenantId } from "../utils/tenant-scope";

type IncomeTransaction = {
  transactionType: "IPL" | "UMKM_ADS" | "DONATION" | "OTHER";
  amount: number;
  transactionDate: string | Date;
  referenceType: "IPL_PAYMENT" | "UMKM_SUBSCRIPTION";
  referenceId: string;
  familyId?: string | null;
  description: string;
};

const toDateOnly = (value: string | Date) => {
  if (typeof value === "string") {
    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (dateOnly) return dateOnly;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal transaksi tidak valid");
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const postIncomeTransaction = async (
  client: PoolClient,
  transaction: IncomeTransaction,
) => client.query(
  `INSERT INTO ${tableNames.financialTransaction}
   (tenant_id,transaction_type,direction,amount,transaction_date,status,reference_type,reference_id,
    family_id,description,posted_by_id,created_by_id)
   VALUES ($1,$2,'INCOME',$3,$4,'POSTED',$5,$6,$7,$8,$9,$9)
   ON CONFLICT (reference_type,reference_id,direction) DO NOTHING`,
  [
    getCurrentTenantId(),
    transaction.transactionType,
    transaction.amount,
    toDateOnly(transaction.transactionDate),
    transaction.referenceType,
    transaction.referenceId,
    transaction.familyId || null,
    transaction.description,
    getCurrentAuth()?.user_id || null,
  ],
);

export const reverseIncomeTransaction = async (
  client: PoolClient,
  referenceType: IncomeTransaction["referenceType"],
  referenceId: string,
  note: string,
) => client.query(
  (() => {
    const values: unknown[] = [referenceType, referenceId, getCurrentAuth()?.user_id || null, note];
    const tenantScope = addTenantScope(values);
    return {
      text: `UPDATE ${tableNames.financialTransaction}
   SET status='REVERSED',reversed_time=now(),reversed_by_id=$3,reversal_note=$4,
       updated_time=now(),updated_by_id=$3
   WHERE reference_type=$1 AND reference_id=$2 AND direction='INCOME'
     AND status='POSTED' AND is_deleted=false AND ${tenantScope}`,
      values,
    };
  })(),
);
