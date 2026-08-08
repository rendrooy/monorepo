CREATE TABLE t_file_object (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES m_tenant(id),
  provider varchar(30) NOT NULL DEFAULT 'SUPABASE'
    CHECK (provider IN ('SUPABASE')),
  bucket varchar(100) NOT NULL,
  object_key varchar(1000) NOT NULL,
  visibility varchar(10) NOT NULL DEFAULT 'PRIVATE'
    CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
  module varchar(40) NOT NULL
    CHECK (module IN ('IPL_PAYMENT', 'UMKM_IMAGE', 'UMKM_PAYMENT')),
  original_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 char(64) NOT NULL,
  status varchar(15) NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE', 'DELETED')),
  uploaded_by_id uuid,
  created_time timestamptz NOT NULL DEFAULT now(),
  updated_time timestamptz,
  deleted_time timestamptz,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_file_object_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_file_object_bucket_key UNIQUE (bucket, object_key),
  CONSTRAINT fk_file_object_tenant_uploader
    FOREIGN KEY (tenant_id, uploaded_by_id) REFERENCES m_user(tenant_id, id)
);

CREATE INDEX ix_file_object_tenant_module_time
  ON t_file_object (tenant_id, module, created_time DESC)
  WHERE is_deleted = false;

ALTER TABLE t_ipl_payment ADD COLUMN proof_file_id uuid;
ALTER TABLE t_umkm_revision ADD COLUMN image_file_id uuid;
ALTER TABLE t_umkm_subscription ADD COLUMN proof_file_id uuid;

ALTER TABLE t_ipl_payment
  ADD CONSTRAINT fk_ipl_payment_tenant_proof_file
  FOREIGN KEY (tenant_id, proof_file_id) REFERENCES t_file_object(tenant_id, id);
ALTER TABLE t_umkm_revision
  ADD CONSTRAINT fk_umkm_revision_tenant_image_file
  FOREIGN KEY (tenant_id, image_file_id) REFERENCES t_file_object(tenant_id, id);
ALTER TABLE t_umkm_subscription
  ADD CONSTRAINT fk_umkm_subscription_tenant_proof_file
  FOREIGN KEY (tenant_id, proof_file_id) REFERENCES t_file_object(tenant_id, id);
