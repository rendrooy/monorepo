import "../config";

import { pool } from "../connection/db";

const failures: string[] = [];
const check = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

const main = async () => {
  const [migration, tenants, duplicateInvoices, crossTenantFiles, failedJobs] = await Promise.all([
    pool.query<{ relation: string | null }>("SELECT to_regclass('m_schema_migration')::text AS relation"),
    pool.query<{ missing: number }>(
      `SELECT count(*)::int AS missing FROM m_tenant tenant
       LEFT JOIN t_tenant_subscription subscription ON subscription.tenant_id=tenant.id
         AND subscription.status IN ('ACTIVE','SUSPENDED') AND subscription.is_deleted=false
       WHERE tenant.is_deleted=false AND subscription.id IS NULL`),
    pool.query(
      `SELECT tenant_id,billing_period FROM t_tenant_invoice WHERE is_deleted=false
       GROUP BY tenant_id,billing_period HAVING count(*)>1`),
    pool.query(
      `SELECT payment.id FROM t_tenant_subscription_payment payment
       LEFT JOIN t_file_object file ON file.id=payment.proof_file_id AND file.tenant_id=payment.tenant_id
       WHERE payment.is_deleted=false AND file.id IS NULL`),
    pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM t_platform_job_run
       WHERE status='FAILED' AND attempt_count>=3`),
  ]);
  check(Boolean(migration.rows[0]?.relation), "Migration history tidak tersedia");
  check((tenants.rows[0]?.missing || 0) === 0, "Ada tenant tanpa subscription aktif");
  check(!duplicateInvoices.rowCount, "Ada invoice ganda pada tenant dan periode yang sama");
  check(!crossTenantFiles.rowCount, "Ada relasi file pembayaran lintas tenant atau hilang");

  const warnings = [
    ...(failedJobs.rows[0]?.count ? [`${failedJobs.rows[0].count} job mencapai batas retry`] : []),
    ...(process.env.NODE_ENV === "production" && process.env.LOG_SQL === "true" ? ["LOG_SQL sebaiknya false di production"] : []),
    ...(process.env.NODE_ENV === "production" && process.env.PLATFORM_SCHEDULER_ENABLED !== "true" ? ["Scheduler production belum aktif"] : []),
  ];
  if (failures.length) throw new Error(failures.join("; "));
  process.stdout.write(`Production readiness checks passed${warnings.length ? `\nWarnings:\n- ${warnings.join("\n- ")}` : ""}\n`);
};

main()
  .catch((error) => { process.stderr.write(`Production readiness failed: ${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; })
  .finally(() => pool.end());
