CREATE TABLE IF NOT EXISTS homehub_revamp.m_ipl_setting (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name varchar(255),
    monthly_amount numeric(18, 2) NOT NULL DEFAULT 0,
    due_day integer NOT NULL DEFAULT 10,
    is_active boolean DEFAULT true,
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    is_deleted boolean DEFAULT false,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS homehub_revamp.t_ipl_bill (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL,
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    amount numeric(18, 2) NOT NULL DEFAULT 0,
    paid_amount numeric(18, 2) NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'UNPAID',
    due_date timestamp with time zone,
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    is_deleted boolean DEFAULT false,
    PRIMARY KEY (id),
    CONSTRAINT t_ipl_bill_family_id_fkey FOREIGN KEY (family_id) REFERENCES homehub_revamp.m_family(id),
    CONSTRAINT t_ipl_bill_status_check CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'))
);

CREATE UNIQUE INDEX IF NOT EXISTS t_ipl_bill_family_period_active_uidx
    ON homehub_revamp.t_ipl_bill (family_id, period_month, period_year)
    WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS homehub_revamp.t_ipl_payment (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bill_id uuid NOT NULL,
    family_id uuid NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    amount numeric(18, 2) NOT NULL DEFAULT 0,
    payment_method varchar(100),
    note text,
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    is_deleted boolean DEFAULT false,
    PRIMARY KEY (id),
    CONSTRAINT t_ipl_payment_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES homehub_revamp.t_ipl_bill(id),
    CONSTRAINT t_ipl_payment_family_id_fkey FOREIGN KEY (family_id) REFERENCES homehub_revamp.m_family(id)
);

CREATE TABLE IF NOT EXISTS homehub_revamp.t_expense (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    expense_date timestamp with time zone DEFAULT now(),
    category varchar(100),
    description text,
    amount numeric(18, 2) NOT NULL DEFAULT 0,
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    is_deleted boolean DEFAULT false,
    PRIMARY KEY (id)
);
