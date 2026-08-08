import type { PoolClient } from "pg";

import { tableNames } from "../config";
import { pool } from "../connection/db";
import { requireCurrentTenantId } from "../utils/tenant-scope";

export const TENANT_FEATURE = {
  FINANCIAL_REPORT: "FINANCIAL_REPORT_ENABLED",
  GUEST_SECURITY: "GUEST_SECURITY_ENABLED",
  IPL: "IPL_ENABLED",
  RESIDENT_DATABASE: "RESIDENT_DATABASE_ENABLED",
  STORAGE_LIMIT: "STORAGE_LIMIT_BYTES",
  UMKM_ADS: "UMKM_ADS_ENABLED",
} as const;

export type TenantFeatureCode =
  (typeof TENANT_FEATURE)[keyof typeof TENANT_FEATURE];

interface EntitlementRow {
  enabled: boolean;
  limit_value: string | null;
  subscription_status: string;
  tenant_status: string;
}

export const getTenantEntitlement = async (
  featureCode: TenantFeatureCode,
  client: PoolClient | typeof pool = pool,
) => {
  const tenantId = requireCurrentTenantId();
  const result = await client.query<EntitlementRow>(
    `SELECT subscription.status AS subscription_status,tenant.status AS tenant_status,
            entitlement.enabled,entitlement.limit_value
     FROM ${tableNames.tenant} tenant
     INNER JOIN ${tableNames.tenantSubscription} subscription
       ON subscription.tenant_id=tenant.id AND subscription.is_deleted=false
       AND subscription.status IN ('ACTIVE','SUSPENDED')
     INNER JOIN ${tableNames.platformPlanEntitlement} entitlement
       ON entitlement.plan_id=subscription.plan_id
     INNER JOIN ${tableNames.platformFeature} feature
       ON feature.id=entitlement.feature_id AND feature.is_deleted=false
     WHERE tenant.id=$1 AND tenant.is_deleted=false AND feature.code=$2
     LIMIT 1`,
    [tenantId, featureCode],
  );
  const row = result.rows[0];
  return row
    ? {
        enabled: row.enabled,
        limitValue:
          row.limit_value === null ? null : Number(row.limit_value),
        subscriptionStatus: row.subscription_status,
        tenantStatus: row.tenant_status,
      }
    : null;
};

export const requireTenantEntitlement = async (
  featureCode: TenantFeatureCode,
  client: PoolClient | typeof pool = pool,
) => {
  const entitlement = await getTenantEntitlement(featureCode, client);
  if (!entitlement) {
    const error = new Error("Subscription tenant belum tersedia") as Error & {
      status?: number;
    };
    error.status = 403;
    throw error;
  }
  if (
    entitlement.subscriptionStatus !== "ACTIVE" ||
    entitlement.tenantStatus !== "ACTIVE"
  ) {
    const error = new Error("Subscription tenant sedang tidak aktif") as Error & {
      status?: number;
    };
    error.status = 423;
    throw error;
  }
  if (!entitlement.enabled) {
    const error = new Error("Fitur tidak tersedia pada paket tenant") as Error & {
      status?: number;
    };
    error.status = 403;
    throw error;
  }
  return entitlement;
};
