CREATE TABLE homehub_revamp.t_ipl_credit_ledger (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES homehub_revamp.m_family(id),
    bill_id uuid REFERENCES homehub_revamp.t_ipl_bill(id),
    payment_id uuid REFERENCES homehub_revamp.t_ipl_payment(id),
    related_ledger_id uuid REFERENCES homehub_revamp.t_ipl_credit_ledger(id),
    transaction_type varchar(30) NOT NULL
        CHECK (transaction_type IN ('EARNED', 'ALLOCATED', 'EARNED_REVERSED', 'ALLOCATION_REVERSED', 'REFUND')),
    amount numeric(18,2) NOT NULL CHECK (amount <> 0),
    balance_after numeric(18,2) NOT NULL CHECK (balance_after >= 0),
    note varchar(1000),
    created_time timestamp with time zone NOT NULL DEFAULT now(),
    created_by_id uuid,
    PRIMARY KEY (id)
);

CREATE INDEX ix_ipl_credit_ledger_family ON homehub_revamp.t_ipl_credit_ledger (family_id, created_time DESC);
CREATE INDEX ix_ipl_credit_ledger_bill ON homehub_revamp.t_ipl_credit_ledger (bill_id);
CREATE INDEX ix_ipl_credit_ledger_payment ON homehub_revamp.t_ipl_credit_ledger (payment_id);
