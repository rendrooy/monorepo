ALTER TABLE homehub_revamp.t_ipl_bill
    DROP CONSTRAINT IF EXISTS t_ipl_bill_status_check;

ALTER TABLE homehub_revamp.t_ipl_bill
    ADD COLUMN IF NOT EXISTS paid_amount numeric(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_amount numeric(18,2) NOT NULL DEFAULT 0,
    ADD CONSTRAINT t_ipl_bill_status_check
        CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID', 'CANCELLED'));

CREATE TABLE homehub_revamp.t_ipl_payment (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL REFERENCES homehub_revamp.t_ipl_bill(id),
    family_id uuid NOT NULL REFERENCES homehub_revamp.m_family(id),
    amount numeric(18,2) NOT NULL CHECK (amount > 0),
    allocated_amount numeric(18,2) NOT NULL DEFAULT 0,
    credit_amount numeric(18,2) NOT NULL DEFAULT 0,
    payment_date date NOT NULL,
    payment_method varchar(30) NOT NULL
        CHECK (payment_method IN ('BANK_TRANSFER', 'CASH', 'OTHER')),
    reference_number varchar(255),
    note varchar(1000),
    proof_path varchar(1000) NOT NULL,
    proof_original_name varchar(255) NOT NULL,
    proof_mime_type varchar(100) NOT NULL,
    proof_size integer NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVERSED')),
    rejection_note varchar(1000),
    submitted_by_role varchar(30) NOT NULL,
    approved_time timestamp with time zone,
    approved_by_id uuid,
    rejected_time timestamp with time zone,
    rejected_by_id uuid,
    reversed_time timestamp with time zone,
    reversed_by_id uuid,
    reversal_note varchar(1000),
    created_time timestamp with time zone NOT NULL DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uq_ipl_payment_pending_bill
    ON homehub_revamp.t_ipl_payment (bill_id)
    WHERE status = 'PENDING' AND is_deleted = false;

CREATE INDEX ix_ipl_payment_family ON homehub_revamp.t_ipl_payment (family_id);
CREATE INDEX ix_ipl_payment_status ON homehub_revamp.t_ipl_payment (status, created_time DESC);

CREATE TABLE homehub_revamp.t_ipl_family_credit (
    family_id uuid NOT NULL REFERENCES homehub_revamp.m_family(id),
    balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_time timestamp with time zone NOT NULL DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    PRIMARY KEY (family_id)
);
