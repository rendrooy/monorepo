CREATE TABLE IF NOT EXISTS homehub_revamp.t_financial_transaction (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type varchar(30) NOT NULL
        CHECK (transaction_type IN ('IPL', 'UMKM_ADS', 'DONATION', 'OTHER')),
    direction varchar(10) NOT NULL DEFAULT 'INCOME'
        CHECK (direction IN ('INCOME', 'EXPENSE')),
    amount numeric(18,2) NOT NULL CHECK (amount > 0),
    transaction_date date NOT NULL,
    status varchar(15) NOT NULL DEFAULT 'POSTED'
        CHECK (status IN ('POSTED', 'REVERSED')),
    reference_type varchar(40) NOT NULL,
    reference_id uuid NOT NULL,
    family_id uuid REFERENCES homehub_revamp.m_family(id),
    description varchar(500),
    posted_time timestamptz NOT NULL DEFAULT now(),
    posted_by_id uuid,
    reversed_time timestamptz,
    reversed_by_id uuid,
    reversal_note varchar(1000),
    created_time timestamptz NOT NULL DEFAULT now(),
    updated_time timestamptz,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT uq_financial_transaction_reference
        UNIQUE (reference_type, reference_id, direction)
);

CREATE INDEX IF NOT EXISTS ix_financial_transaction_date
    ON homehub_revamp.t_financial_transaction (transaction_date DESC);
CREATE INDEX IF NOT EXISTS ix_financial_transaction_type
    ON homehub_revamp.t_financial_transaction (transaction_type, status, transaction_date DESC);

-- Backfill penerimaan IPL yang sudah disetujui sebelum ledger terpusat tersedia.
INSERT INTO homehub_revamp.t_financial_transaction
    (transaction_type, direction, amount, transaction_date, status, reference_type,
     reference_id, family_id, description, posted_time, posted_by_id, created_by_id)
SELECT 'IPL', 'INCOME', payment.amount, payment.payment_date, 'POSTED',
       'IPL_PAYMENT', payment.id, payment.family_id,
       'Pembayaran IPL ' || bill.bill_number,
       COALESCE(payment.approved_time, payment.created_time),
       payment.approved_by_id, payment.created_by_id
FROM homehub_revamp.t_ipl_payment payment
JOIN homehub_revamp.t_ipl_bill bill ON bill.id = payment.bill_id
WHERE payment.status = 'APPROVED' AND payment.is_deleted = false
ON CONFLICT (reference_type, reference_id, direction) DO NOTHING;

-- Status berikut menunjukkan pembayaran iklan telah disetujui bendahara.
INSERT INTO homehub_revamp.t_financial_transaction
    (transaction_type, direction, amount, transaction_date, status, reference_type,
     reference_id, family_id, description, posted_time, posted_by_id, created_by_id)
SELECT 'UMKM_ADS', 'INCOME', subscription.amount, subscription.payment_date, 'POSTED',
       'UMKM_SUBSCRIPTION', subscription.id, business.family_id,
       'Pembayaran iklan UMKM ' || revision.name,
       COALESCE(subscription.reviewed_time, subscription.created_time),
       subscription.reviewed_by_id, subscription.created_by_id
FROM homehub_revamp.t_umkm_subscription subscription
JOIN homehub_revamp.m_umkm business ON business.id = subscription.umkm_id
JOIN homehub_revamp.t_umkm_revision revision ON revision.id = subscription.revision_id
WHERE subscription.status IN ('READY_TO_RELEASE', 'ACTIVE', 'EXPIRED')
  AND subscription.amount > 0 AND subscription.is_deleted = false
ON CONFLICT (reference_type, reference_id, direction) DO NOTHING;
