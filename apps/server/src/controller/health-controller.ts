import type { Request, Response } from "express";

import { dbConnection, jwtConfig, objectStorageConfig, platformJwtConfig, tableNames } from "../config";
import { pool } from "../connection/db";

const startedTime = new Date().toISOString();

export const liveHealth = (_request: Request, response: Response) => {
  response.status(200).json({ data: { started_time: startedTime, uptime_seconds: Math.round(process.uptime()) }, message: "OK", status: 200 });
};

export const readyHealth = async (_request: Request, response: Response) => {
  const production = process.env.NODE_ENV === "production";
  const checks: Record<string, boolean> = {
    database: false,
    jwt: Boolean(jwtConfig.secret && platformJwtConfig.secret)
      && (!production || (jwtConfig.secret !== "secret" && platformJwtConfig.secret !== `${jwtConfig.secret}:platform`)),
    storage: Boolean(objectStorageConfig.endpoint && objectStorageConfig.accessKeyId && objectStorageConfig.secretAccessKey),
    database_config: Boolean(dbConnection.connectionString || (dbConnection.host && dbConnection.database && dbConnection.user)),
  };
  try { await pool.query("SELECT 1"); checks.database = true; } catch { checks.database = false; }
  const ready = Object.values(checks).every(Boolean);
  response.status(ready ? 200 : 503).json({ data: { checks }, message: ready ? "READY" : "NOT_READY", status: ready ? 200 : 503 });
};

export const platformOperationsSummary = async (_request: Request, response: Response) => {
  const [tenants, invoices, payments, storage, jobs] = await Promise.all([
    pool.query<{ active: number; suspended: number }>(
      `SELECT count(*) FILTER (WHERE status='ACTIVE')::int AS active,
              count(*) FILTER (WHERE status='SUSPENDED')::int AS suspended
       FROM ${tableNames.tenant} WHERE is_deleted=false`),
    pool.query<{ overdue: number }>(
      `SELECT count(*)::int AS overdue FROM ${tableNames.tenantInvoice}
       WHERE status='OVERDUE' AND is_deleted=false`),
    pool.query<{ pending: number }>(
      `SELECT count(*)::int AS pending FROM ${tableNames.tenantSubscriptionPayment}
       WHERE status='PENDING' AND is_deleted=false`),
    pool.query<{ bytes: number }>(
      `SELECT COALESCE(sum(size_bytes),0)::float8 AS bytes FROM ${tableNames.fileObject}
       WHERE status='AVAILABLE' AND is_deleted=false`),
    pool.query(
      `SELECT job_code,scheduled_for,status,attempt_count,started_time,finished_time,next_retry_time,last_error,result_json
       FROM ${tableNames.platformJobRun} ORDER BY scheduled_for DESC,created_time DESC LIMIT 10`),
  ]);
  response.status(200).json({
    data: {
      invoices_overdue: invoices.rows[0]?.overdue || 0,
      jobs: jobs.rows,
      payments_pending: payments.rows[0]?.pending || 0,
      storage_bytes: storage.rows[0]?.bytes || 0,
      tenants_active: tenants.rows[0]?.active || 0,
      tenants_suspended: tenants.rows[0]?.suspended || 0,
    },
    message: "Request successful",
    status: 200,
  });
};
