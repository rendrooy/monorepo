CREATE TABLE IF NOT EXISTS homehub_revamp.m_umkm_subscription_plan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(150) NOT NULL,
    price numeric(18,2) NOT NULL CHECK (price > 0), duration_days integer NOT NULL CHECK (duration_days > 0),
    description varchar(500), is_active boolean NOT NULL DEFAULT true,
    created_time timestamptz NOT NULL DEFAULT now(), updated_time timestamptz,
    created_by_id uuid, updated_by_id uuid, is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS homehub_revamp.t_umkm_subscription (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), umkm_id uuid NOT NULL REFERENCES homehub_revamp.m_umkm(id),
    revision_id uuid NOT NULL REFERENCES homehub_revamp.t_umkm_revision(id),
    plan_id uuid NOT NULL REFERENCES homehub_revamp.m_umkm_subscription_plan(id),
    plan_name varchar(150) NOT NULL, price numeric(18,2) NOT NULL, duration_days integer NOT NULL,
    amount numeric(18,2), payment_date date, payment_method varchar(30), reference_number varchar(255), note varchar(1000),
    proof_path varchar(1000), proof_original_name varchar(255), proof_mime_type varchar(100), proof_size integer,
    status varchar(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_CONTENT_REVIEW','CONTENT_REJECTED','PENDING_PAYMENT_REVIEW','PAYMENT_REJECTED','READY_TO_RELEASE','ACTIVE','EXPIRED','CANCELLED')),
    rejection_note varchar(1000), submitted_time timestamptz, reviewed_time timestamptz, reviewed_by_id uuid,
    ready_time timestamptz, released_time timestamptz, start_date date, end_date date,
    created_time timestamptz NOT NULL DEFAULT now(), updated_time timestamptz,
    created_by_id uuid, updated_by_id uuid, is_deleted boolean NOT NULL DEFAULT false
);

-- Migration untuk instalasi Phase 2 yang sudah pernah dijalankan.
ALTER TABLE homehub_revamp.t_umkm_subscription DROP CONSTRAINT IF EXISTS t_umkm_subscription_status_check;
ALTER TABLE homehub_revamp.t_umkm_subscription
    ADD COLUMN IF NOT EXISTS revision_id uuid REFERENCES homehub_revamp.t_umkm_revision(id),
    ADD COLUMN IF NOT EXISTS ready_time timestamptz,
    ADD COLUMN IF NOT EXISTS released_time timestamptz,
    ALTER COLUMN status SET DEFAULT 'DRAFT';
UPDATE homehub_revamp.t_umkm_subscription subscription
SET revision_id=business.approved_revision_id
FROM homehub_revamp.m_umkm business
WHERE business.id=subscription.umkm_id AND subscription.revision_id IS NULL;
UPDATE homehub_revamp.t_umkm_subscription SET status=CASE status
    WHEN 'WAITING_PAYMENT' THEN 'DRAFT'
    WHEN 'WAITING_PAYMENT_REVIEW' THEN 'PENDING_PAYMENT_REVIEW'
    ELSE status END;
ALTER TABLE homehub_revamp.t_umkm_subscription
    ADD CONSTRAINT t_umkm_subscription_status_check CHECK (status IN ('DRAFT','PENDING_CONTENT_REVIEW','CONTENT_REJECTED','PENDING_PAYMENT_REVIEW','PAYMENT_REJECTED','READY_TO_RELEASE','ACTIVE','EXPIRED','CANCELLED'));
DROP INDEX IF EXISTS homehub_revamp.uq_umkm_subscription_open;
DROP INDEX IF EXISTS homehub_revamp.uq_umkm_subscription_revision;
CREATE UNIQUE INDEX IF NOT EXISTS uq_umkm_subscription_revision ON homehub_revamp.t_umkm_subscription(revision_id)
WHERE status IN ('DRAFT','PENDING_CONTENT_REVIEW','CONTENT_REJECTED','PENDING_PAYMENT_REVIEW','PAYMENT_REJECTED','READY_TO_RELEASE') AND is_deleted=false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_umkm_subscription_active ON homehub_revamp.t_umkm_subscription(umkm_id)
WHERE status='ACTIVE' AND is_deleted=false;
CREATE INDEX IF NOT EXISTS ix_umkm_subscription_status ON homehub_revamp.t_umkm_subscription(status, created_time DESC);
