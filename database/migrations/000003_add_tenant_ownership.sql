ALTER TABLE m_family
  ADD COLUMN tenant_id uuid REFERENCES m_tenant(id),
  ADD COLUMN area_id uuid REFERENCES m_tenant_area(id);
ALTER TABLE m_member ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE m_umkm ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_umkm_revision ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_umkm_subscription ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_financial_transaction ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_guest_visit ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_guest_vehicle ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_guest_visit_history ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_ipl_bill_batch ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_ipl_bill ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_ipl_credit_ledger ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_ipl_family_credit ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_ipl_payment ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);
ALTER TABLE t_notification ADD COLUMN tenant_id uuid REFERENCES m_tenant(id);

CREATE INDEX ix_family_tenant ON m_family (tenant_id) WHERE is_deleted = false;
CREATE INDEX ix_member_tenant ON m_member (tenant_id) WHERE is_deleted = false;
CREATE INDEX ix_umkm_tenant ON m_umkm (tenant_id) WHERE is_deleted = false;
CREATE INDEX ix_umkm_revision_tenant ON t_umkm_revision (tenant_id) WHERE is_deleted = false;
CREATE INDEX ix_umkm_subscription_tenant ON t_umkm_subscription (tenant_id) WHERE is_deleted = false;
CREATE INDEX ix_financial_transaction_tenant_date
  ON t_financial_transaction (tenant_id, transaction_date DESC) WHERE is_deleted = false;
CREATE INDEX ix_guest_visit_tenant_time
  ON t_guest_visit (tenant_id, created_time DESC) WHERE is_deleted = false;
CREATE INDEX ix_guest_vehicle_tenant ON t_guest_vehicle (tenant_id) WHERE is_deleted = false;
CREATE INDEX ix_guest_history_tenant_time
  ON t_guest_visit_history (tenant_id, created_time DESC);
CREATE INDEX ix_ipl_bill_batch_tenant_period
  ON t_ipl_bill_batch (tenant_id, period) WHERE is_deleted = false;
CREATE INDEX ix_ipl_bill_tenant_family
  ON t_ipl_bill (tenant_id, family_id) WHERE is_deleted = false;
CREATE INDEX ix_ipl_credit_ledger_tenant_family
  ON t_ipl_credit_ledger (tenant_id, family_id);
CREATE INDEX ix_ipl_family_credit_tenant ON t_ipl_family_credit (tenant_id);
CREATE INDEX ix_ipl_payment_tenant_time
  ON t_ipl_payment (tenant_id, created_time DESC) WHERE is_deleted = false;
CREATE INDEX ix_notification_tenant_user
  ON t_notification (tenant_id, user_id) WHERE is_deleted = false;

DROP INDEX IF EXISTS uq_member_nik_lookup_hash;
CREATE UNIQUE INDEX uq_member_nik_lookup_hash_tenant
  ON m_member (tenant_id, nik_lookup_hash)
  WHERE tenant_id IS NOT NULL AND nik_lookup_hash IS NOT NULL AND is_deleted = false;
CREATE UNIQUE INDEX uq_member_nik_lookup_hash_legacy
  ON m_member (nik_lookup_hash)
  WHERE tenant_id IS NULL AND nik_lookup_hash IS NOT NULL AND is_deleted = false;

COMMENT ON COLUMN m_user.tenant_id IS 'Nullable only during the pre-cutover legacy compatibility period';
COMMENT ON COLUMN m_family.tenant_id IS 'Nullable only during the pre-cutover legacy compatibility period';
COMMENT ON COLUMN m_member.tenant_id IS 'Nullable only during the pre-cutover legacy compatibility period';
