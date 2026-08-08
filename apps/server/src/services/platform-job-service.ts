import { tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import { reconcileTenantSubscriptions } from "./platform-billing-service";

const JOB_CODE = "TENANT_SUBSCRIPTION_RECONCILIATION";
const MAX_ATTEMPTS = 3;
const RETRY_MINUTES = 15;

const jakartaDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit", month: "2-digit", timeZone: "Asia/Jakarta", year: "numeric",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const runSubscriptionJob = async (scheduledFor = jakartaDate()) => {
  const claim = await pool.query<{ attempt_count: number; id: string }>(
    `INSERT INTO ${tableNames.platformJobRun}
       (job_code,scheduled_for,status,attempt_count,started_time)
     VALUES ($1,$2,'RUNNING',1,now())
     ON CONFLICT (job_code,scheduled_for) DO UPDATE SET
       status='RUNNING',attempt_count=${tableNames.platformJobRun}.attempt_count+1,
       started_time=now(),finished_time=NULL,next_retry_time=NULL,last_error=NULL,updated_time=now()
     WHERE ${tableNames.platformJobRun}.attempt_count<$3 AND (
       (${tableNames.platformJobRun}.status='FAILED'
         AND (${tableNames.platformJobRun}.next_retry_time IS NULL OR ${tableNames.platformJobRun}.next_retry_time<=now()))
       OR (${tableNames.platformJobRun}.status='RUNNING'
         AND ${tableNames.platformJobRun}.started_time<now()-interval '30 minutes')
     )
     RETURNING id,attempt_count`,
    [JOB_CODE, scheduledFor, MAX_ATTEMPTS],
  );
  const job = claim.rows[0];
  if (!job) return { claimed: false, generated: 0 };

  try {
    const generated = await reconcileTenantSubscriptions();
    await pool.query(
      `UPDATE ${tableNames.platformJobRun}
       SET status='SUCCEEDED',finished_time=now(),result_json=$2::jsonb,updated_time=now()
       WHERE id=$1`,
      [job.id, JSON.stringify({ generated })],
    );
    logger.info({ attempt: job.attempt_count, generated, jobCode: JOB_CODE, scheduledFor }, "Platform job succeeded");
    return { claimed: true, generated };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 2000) : "Unknown job error";
    await pool.query(
      `UPDATE ${tableNames.platformJobRun}
       SET status='FAILED',finished_time=now(),last_error=$2,
           next_retry_time=CASE WHEN attempt_count<$3 THEN now()+($4::text||' minutes')::interval ELSE NULL END,
           updated_time=now() WHERE id=$1`,
      [job.id, message, MAX_ATTEMPTS, RETRY_MINUTES],
    );
    logger.error({ attempt: job.attempt_count, err: error, jobCode: JOB_CODE, scheduledFor }, "Platform job failed");
    throw error;
  }
};
