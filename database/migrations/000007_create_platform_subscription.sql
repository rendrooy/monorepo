CREATE TABLE m_platform_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL,
  name varchar(100) NOT NULL,
  billing_period varchar(20) NOT NULL DEFAULT 'MONTHLY'
    CHECK (billing_period IN ('MONTHLY')),
  price numeric(18,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status varchar(15) NOT NULL DEFAULT 'INACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_platform_plan_code_active
  ON m_platform_plan (lower(code)) WHERE is_deleted=false;

CREATE TABLE m_platform_feature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL,
  name varchar(150) NOT NULL,
  value_type varchar(15) NOT NULL
    CHECK (value_type IN ('BOOLEAN', 'NUMBER')),
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX uq_platform_feature_code_active
  ON m_platform_feature (lower(code)) WHERE is_deleted=false;

CREATE TABLE m_platform_plan_entitlement (
  plan_id uuid NOT NULL REFERENCES m_platform_plan(id),
  feature_id uuid NOT NULL REFERENCES m_platform_feature(id),
  enabled boolean NOT NULL DEFAULT false,
  limit_value bigint,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  PRIMARY KEY (plan_id,feature_id)
);

CREATE TABLE t_tenant_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES m_tenant(id),
  plan_id uuid NOT NULL REFERENCES m_platform_plan(id),
  next_plan_id uuid REFERENCES m_platform_plan(id),
  status varchar(15) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','SUSPENDED','CANCELED','EXPIRED')),
  started_time timestamptz NOT NULL DEFAULT now(),
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  scheduled_plan_change_time timestamptz,
  change_requested_by_id uuid,
  change_approved_by_id uuid,
  change_approved_time timestamptz,
  canceled_time timestamptz,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_tenant_subscription_tenant_id UNIQUE (tenant_id,id),
  CONSTRAINT chk_tenant_subscription_period CHECK (current_period_end >= current_period_start),
  CONSTRAINT fk_tenant_subscription_requester
    FOREIGN KEY (tenant_id,change_requested_by_id) REFERENCES m_user(tenant_id,id)
);

CREATE UNIQUE INDEX uq_tenant_subscription_current
  ON t_tenant_subscription (tenant_id)
  WHERE status IN ('ACTIVE','SUSPENDED') AND is_deleted=false;

CREATE SEQUENCE tenant_invoice_number_seq;

CREATE TABLE t_tenant_invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES m_tenant(id),
  subscription_id uuid NOT NULL,
  invoice_number varchar(50) NOT NULL UNIQUE,
  plan_code varchar(30) NOT NULL,
  plan_name varchar(100) NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  billing_period date NOT NULL,
  status varchar(15) NOT NULL DEFAULT 'ISSUED'
    CHECK (status IN ('DRAFT','ISSUED','PAID','VOID','OVERDUE')),
  issued_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL,
  paid_time timestamptz,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_tenant_invoice_tenant_id UNIQUE (tenant_id,id),
  CONSTRAINT uq_tenant_invoice_period UNIQUE (tenant_id,billing_period),
  CONSTRAINT fk_tenant_invoice_subscription
    FOREIGN KEY (tenant_id,subscription_id) REFERENCES t_tenant_subscription(tenant_id,id)
);

CREATE INDEX ix_tenant_invoice_status_due
  ON t_tenant_invoice (status,due_date) WHERE is_deleted=false;

ALTER TABLE t_file_object DROP CONSTRAINT t_file_object_module_check;
ALTER TABLE t_file_object ADD CONSTRAINT t_file_object_module_check
  CHECK (module IN ('IPL_PAYMENT','UMKM_IMAGE','UMKM_PAYMENT','PLATFORM_SUBSCRIPTION_PAYMENT'));

CREATE TABLE t_tenant_subscription_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES m_tenant(id),
  invoice_id uuid NOT NULL,
  proof_file_id uuid NOT NULL,
  payment_provider varchar(30) NOT NULL DEFAULT 'MANUAL'
    CHECK (payment_provider IN ('MANUAL')),
  provider_reference varchar(255),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  status varchar(15) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  rejection_note varchar(1000),
  paid_time timestamptz,
  reviewed_time timestamptz,
  reviewed_by_platform_user_id uuid REFERENCES m_platform_user(id),
  created_by_id uuid,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_tenant_subscription_payment_tenant_id UNIQUE (tenant_id,id),
  CONSTRAINT fk_tenant_subscription_payment_invoice
    FOREIGN KEY (tenant_id,invoice_id) REFERENCES t_tenant_invoice(tenant_id,id),
  CONSTRAINT fk_tenant_subscription_payment_file
    FOREIGN KEY (tenant_id,proof_file_id) REFERENCES t_file_object(tenant_id,id),
  CONSTRAINT fk_tenant_subscription_payment_creator
    FOREIGN KEY (tenant_id,created_by_id) REFERENCES m_user(tenant_id,id)
);

CREATE UNIQUE INDEX uq_tenant_subscription_payment_pending
  ON t_tenant_subscription_payment (invoice_id)
  WHERE status='PENDING' AND is_deleted=false;

INSERT INTO m_platform_plan (code,name,billing_period,price,status)
VALUES
  ('FREE','Free','MONTHLY',0,'ACTIVE'),
  ('EXTRA','Extra','MONTHLY',0,'INACTIVE'),
  ('SUPER','Super','MONTHLY',0,'INACTIVE');

INSERT INTO m_platform_feature (code,name,value_type)
VALUES
  ('RESIDENT_DATABASE_ENABLED','Database warga','BOOLEAN'),
  ('IPL_ENABLED','Billing dan pembayaran IPL','BOOLEAN'),
  ('UMKM_ADS_ENABLED','Iklan UMKM','BOOLEAN'),
  ('GUEST_SECURITY_ENABLED','Management guest','BOOLEAN'),
  ('FINANCIAL_REPORT_ENABLED','Dashboard dan laporan pendapatan','BOOLEAN'),
  ('STORAGE_LIMIT_BYTES','Batas penyimpanan tenant','NUMBER');

INSERT INTO m_platform_plan_entitlement (plan_id,feature_id,enabled,limit_value)
SELECT plan.id,feature.id,
  CASE
    WHEN feature.code='STORAGE_LIMIT_BYTES' THEN true
    WHEN feature.code='RESIDENT_DATABASE_ENABLED' THEN true
    WHEN plan.code IN ('EXTRA','SUPER') AND feature.code IN ('IPL_ENABLED','FINANCIAL_REPORT_ENABLED') THEN true
    WHEN plan.code='SUPER' AND feature.code IN ('UMKM_ADS_ENABLED','GUEST_SECURITY_ENABLED') THEN true
    ELSE false
  END,
  CASE feature.code
    WHEN 'STORAGE_LIMIT_BYTES' THEN CASE plan.code
      WHEN 'FREE' THEN 1073741824
      WHEN 'EXTRA' THEN 5368709120
      WHEN 'SUPER' THEN 21474836480
    END
    ELSE NULL
  END
FROM m_platform_plan plan
CROSS JOIN m_platform_feature feature;

WITH free_plan AS (
  SELECT id FROM m_platform_plan WHERE code='FREE' AND is_deleted=false LIMIT 1
), inserted AS (
  INSERT INTO t_tenant_subscription
    (tenant_id,plan_id,status,current_period_start,current_period_end)
  SELECT tenant.id,free_plan.id,'ACTIVE',date_trunc('month',current_date)::date,
    (date_trunc('month',current_date)+interval '1 month - 1 day')::date
  FROM m_tenant tenant CROSS JOIN free_plan
  WHERE tenant.is_deleted=false
  RETURNING id,tenant_id
)
INSERT INTO t_tenant_invoice
  (tenant_id,subscription_id,invoice_number,plan_code,plan_name,amount,billing_period,status,issued_date,due_date,paid_time)
SELECT inserted.tenant_id,inserted.id,
  'HH-' || to_char(current_date,'YYYYMM') || '-' || lpad(nextval('tenant_invoice_number_seq')::text,6,'0'),
  'FREE','Free',0,date_trunc('month',current_date)::date,'PAID',current_date,current_date,now()
FROM inserted;
