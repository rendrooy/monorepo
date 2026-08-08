import "../config";

import { pool } from "../connection/db";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
};

const main = async () => {
  const plans = await pool.query<{
    code: string;
    feature_code: string;
    enabled: boolean;
    limit_value: string | null;
  }>(
    `SELECT plan.code,feature.code AS feature_code,entitlement.enabled,entitlement.limit_value
     FROM m_platform_plan plan
     INNER JOIN m_platform_plan_entitlement entitlement ON entitlement.plan_id=plan.id
     INNER JOIN m_platform_feature feature ON feature.id=entitlement.feature_id
     WHERE plan.is_deleted=false AND feature.is_deleted=false`,
  );
  const entitlement = (plan: string, feature: string) =>
    plans.rows.find((row) => row.code === plan && row.feature_code === feature);
  assert(entitlement("FREE", "RESIDENT_DATABASE_ENABLED")?.enabled, "FREE memiliki database warga");
  assert(!entitlement("FREE", "IPL_ENABLED")?.enabled, "FREE tidak memiliki IPL");
  assert(entitlement("EXTRA", "IPL_ENABLED")?.enabled, "EXTRA memiliki IPL");
  assert(!entitlement("EXTRA", "UMKM_ADS_ENABLED")?.enabled, "EXTRA tidak memiliki UMKM Ads");
  assert(entitlement("SUPER", "UMKM_ADS_ENABLED")?.enabled, "SUPER memiliki UMKM Ads");
  assert(entitlement("SUPER", "GUEST_SECURITY_ENABLED")?.enabled, "SUPER memiliki management guest");
  assert(Number(entitlement("FREE", "STORAGE_LIMIT_BYTES")?.limit_value) === 1024 ** 3, "kuota FREE 1 GB");
  assert(Number(entitlement("EXTRA", "STORAGE_LIMIT_BYTES")?.limit_value) === 5 * 1024 ** 3, "kuota EXTRA 5 GB");
  assert(Number(entitlement("SUPER", "STORAGE_LIMIT_BYTES")?.limit_value) === 20 * 1024 ** 3, "kuota SUPER 20 GB");

  const duplicateSubscriptions = await pool.query(
    `SELECT tenant_id FROM t_tenant_subscription
     WHERE status IN ('ACTIVE','SUSPENDED') AND is_deleted=false
     GROUP BY tenant_id HAVING count(*)>1`,
  );
  assert(!duplicateSubscriptions.rowCount, "tidak ada subscription aktif ganda");

  const tenantsWithoutSubscription = await pool.query(
    `SELECT tenant.id FROM m_tenant tenant
     LEFT JOIN t_tenant_subscription subscription ON subscription.tenant_id=tenant.id
       AND subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false
     WHERE tenant.is_deleted=false AND subscription.id IS NULL`,
  );
  assert(!tenantsWithoutSubscription.rowCount, "semua tenant memiliki subscription");

  const duplicateInvoices = await pool.query(
    `SELECT tenant_id,billing_period FROM t_tenant_invoice WHERE is_deleted=false
     GROUP BY tenant_id,billing_period HAVING count(*)>1`,
  );
  assert(!duplicateInvoices.rowCount, "invoice tenant per periode idempotent");

  const invalidFreeInvoices = await pool.query(
    `SELECT id FROM t_tenant_invoice
     WHERE plan_code='FREE' AND (amount<>0 OR status<>'PAID') AND is_deleted=false`,
  );
  assert(!invalidFreeInvoices.rowCount, "invoice FREE bernilai nol dan otomatis lunas");

  const crossTenantPayments = await pool.query(
    `SELECT payment.id FROM t_tenant_subscription_payment payment
     LEFT JOIN t_tenant_invoice invoice ON invoice.id=payment.invoice_id AND invoice.tenant_id=payment.tenant_id
     LEFT JOIN t_file_object file ON file.id=payment.proof_file_id AND file.tenant_id=payment.tenant_id
     WHERE payment.is_deleted=false AND (invoice.id IS NULL OR file.id IS NULL)`,
  );
  assert(!crossTenantPayments.rowCount, "invoice dan file pembayaran tetap dalam tenant yang sama");

  process.stdout.write("Platform subscription read-only verification passed\n");
};

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
