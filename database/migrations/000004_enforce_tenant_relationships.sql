ALTER TABLE m_family ADD CONSTRAINT uq_family_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE m_member ADD CONSTRAINT uq_member_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE m_user ADD CONSTRAINT uq_user_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE m_umkm ADD CONSTRAINT uq_umkm_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_umkm_revision ADD CONSTRAINT uq_umkm_revision_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_umkm_subscription ADD CONSTRAINT uq_umkm_subscription_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_financial_transaction ADD CONSTRAINT uq_financial_transaction_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_guest_visit ADD CONSTRAINT uq_guest_visit_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_guest_vehicle ADD CONSTRAINT uq_guest_vehicle_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_guest_visit_history ADD CONSTRAINT uq_guest_visit_history_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_ipl_bill_batch ADD CONSTRAINT uq_ipl_bill_batch_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_ipl_bill ADD CONSTRAINT uq_ipl_bill_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_ipl_credit_ledger ADD CONSTRAINT uq_ipl_credit_ledger_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_ipl_payment ADD CONSTRAINT uq_ipl_payment_tenant_id UNIQUE (tenant_id, id);
ALTER TABLE t_notification ADD CONSTRAINT uq_notification_tenant_id UNIQUE (tenant_id, id);

ALTER TABLE m_family
  ADD CONSTRAINT fk_family_tenant_area
  FOREIGN KEY (tenant_id, area_id) REFERENCES m_tenant_area(tenant_id, id);
ALTER TABLE m_member
  ADD CONSTRAINT fk_member_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id);
ALTER TABLE m_user
  ADD CONSTRAINT fk_user_tenant_member
  FOREIGN KEY (tenant_id, member_id) REFERENCES m_member(tenant_id, id);

ALTER TABLE m_umkm
  ADD CONSTRAINT fk_umkm_tenant_owner
  FOREIGN KEY (tenant_id, owner_user_id) REFERENCES m_user(tenant_id, id),
  ADD CONSTRAINT fk_umkm_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id),
  ADD CONSTRAINT fk_umkm_tenant_approved_revision
  FOREIGN KEY (tenant_id, approved_revision_id) REFERENCES t_umkm_revision(tenant_id, id);
ALTER TABLE t_umkm_revision
  ADD CONSTRAINT fk_umkm_revision_tenant_umkm
  FOREIGN KEY (tenant_id, umkm_id) REFERENCES m_umkm(tenant_id, id);
ALTER TABLE t_umkm_subscription
  ADD CONSTRAINT fk_umkm_subscription_tenant_umkm
  FOREIGN KEY (tenant_id, umkm_id) REFERENCES m_umkm(tenant_id, id),
  ADD CONSTRAINT fk_umkm_subscription_tenant_revision
  FOREIGN KEY (tenant_id, revision_id) REFERENCES t_umkm_revision(tenant_id, id);

ALTER TABLE t_financial_transaction
  ADD CONSTRAINT fk_financial_transaction_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id);

ALTER TABLE t_guest_visit
  ADD CONSTRAINT fk_guest_visit_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id),
  ADD CONSTRAINT fk_guest_visit_tenant_reporter
  FOREIGN KEY (tenant_id, reported_by_id) REFERENCES m_user(tenant_id, id);
ALTER TABLE t_guest_vehicle
  ADD CONSTRAINT fk_guest_vehicle_tenant_visit
  FOREIGN KEY (tenant_id, guest_visit_id) REFERENCES t_guest_visit(tenant_id, id);
ALTER TABLE t_guest_visit_history
  ADD CONSTRAINT fk_guest_history_tenant_visit
  FOREIGN KEY (tenant_id, guest_visit_id) REFERENCES t_guest_visit(tenant_id, id);

ALTER TABLE t_ipl_bill
  ADD CONSTRAINT fk_ipl_bill_tenant_batch
  FOREIGN KEY (tenant_id, batch_id) REFERENCES t_ipl_bill_batch(tenant_id, id),
  ADD CONSTRAINT fk_ipl_bill_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id);
ALTER TABLE t_ipl_payment
  ADD CONSTRAINT fk_ipl_payment_tenant_bill
  FOREIGN KEY (tenant_id, bill_id) REFERENCES t_ipl_bill(tenant_id, id),
  ADD CONSTRAINT fk_ipl_payment_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id);
ALTER TABLE t_ipl_family_credit
  ADD CONSTRAINT fk_ipl_family_credit_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id);
ALTER TABLE t_ipl_credit_ledger
  ADD CONSTRAINT fk_ipl_credit_ledger_tenant_family
  FOREIGN KEY (tenant_id, family_id) REFERENCES m_family(tenant_id, id),
  ADD CONSTRAINT fk_ipl_credit_ledger_tenant_bill
  FOREIGN KEY (tenant_id, bill_id) REFERENCES t_ipl_bill(tenant_id, id),
  ADD CONSTRAINT fk_ipl_credit_ledger_tenant_payment
  FOREIGN KEY (tenant_id, payment_id) REFERENCES t_ipl_payment(tenant_id, id),
  ADD CONSTRAINT fk_ipl_credit_ledger_tenant_related
  FOREIGN KEY (tenant_id, related_ledger_id) REFERENCES t_ipl_credit_ledger(tenant_id, id);

ALTER TABLE t_notification
  ADD CONSTRAINT fk_notification_tenant_user
  FOREIGN KEY (tenant_id, user_id) REFERENCES m_user(tenant_id, id);
