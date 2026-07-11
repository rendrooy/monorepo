CREATE SEQUENCE IF NOT EXISTS homehub_revamp.ipl_bill_number_seq;

CREATE TABLE homehub_revamp.t_ipl_bill_batch (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    period varchar(8) NOT NULL,
    amount numeric(18,2) NOT NULL CHECK (amount > 0),
    note varchar(1000),
    status varchar(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED')),
    published_time timestamp with time zone,
    published_by_id uuid,
    created_time timestamp with time zone NOT NULL DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

CREATE TABLE homehub_revamp.t_ipl_bill (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES homehub_revamp.t_ipl_bill_batch(id),
    family_id uuid NOT NULL REFERENCES homehub_revamp.m_family(id),
    bill_number varchar(40) NOT NULL UNIQUE,
    period varchar(8) NOT NULL,
    amount numeric(18,2) NOT NULL CHECK (amount > 0),
    note varchar(1000),
    status varchar(20) NOT NULL DEFAULT 'UNPAID'
        CHECK (status IN ('UNPAID', 'CANCELLED')),
    created_time timestamp with time zone NOT NULL DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX uq_ipl_bill_active_family_period
    ON homehub_revamp.t_ipl_bill (family_id, period)
    WHERE status <> 'CANCELLED' AND is_deleted = false;

CREATE INDEX ix_ipl_bill_batch_id ON homehub_revamp.t_ipl_bill (batch_id);
CREATE INDEX ix_ipl_bill_family_id ON homehub_revamp.t_ipl_bill (family_id);

CREATE TABLE homehub_revamp.t_notification (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES homehub_revamp.m_user(id),
    type varchar(50) NOT NULL,
    title varchar(255) NOT NULL,
    message varchar(1000) NOT NULL,
    reference_id uuid,
    reference_url varchar(500),
    is_read boolean NOT NULL DEFAULT false,
    read_time timestamp with time zone,
    created_time timestamp with time zone NOT NULL DEFAULT now(),
    created_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

CREATE INDEX ix_notification_user_unread
    ON homehub_revamp.t_notification (user_id, is_read, created_time DESC)
    WHERE is_deleted = false;
