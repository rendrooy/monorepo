CREATE TABLE t_platform_job_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code varchar(100) NOT NULL,
  scheduled_for date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'RUNNING'
    CHECK (status IN ('RUNNING','SUCCEEDED','FAILED')),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  started_time timestamptz NOT NULL DEFAULT now(),
  finished_time timestamptz,
  next_retry_time timestamptz,
  last_error text,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  CONSTRAINT uq_platform_job_run_schedule UNIQUE (job_code,scheduled_for)
);

CREATE INDEX ix_platform_job_run_status_retry
  ON t_platform_job_run (status,next_retry_time)
  WHERE status='FAILED';
