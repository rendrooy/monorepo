ALTER TABLE homehub_revamp.m_member
  ADD COLUMN IF NOT EXISTS nik_ciphertext text,
  ADD COLUMN IF NOT EXISTS nik_iv varchar(32),
  ADD COLUMN IF NOT EXISTS nik_auth_tag varchar(32),
  ADD COLUMN IF NOT EXISTS nik_lookup_hash char(64),
  ADD COLUMN IF NOT EXISTS nik_last4 char(4),
  ADD COLUMN IF NOT EXISTS nik_key_version integer;

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_nik_lookup_hash
  ON homehub_revamp.m_member(nik_lookup_hash)
  WHERE nik_lookup_hash IS NOT NULL AND is_deleted=false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='chk_member_nik_plaintext_empty'
      AND conrelid='homehub_revamp.m_member'::regclass
  ) THEN
    ALTER TABLE homehub_revamp.m_member
      ADD CONSTRAINT chk_member_nik_plaintext_empty CHECK (nik IS NULL) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN homehub_revamp.m_member.nik_ciphertext IS 'NIK encrypted with AES-256-GCM';
COMMENT ON COLUMN homehub_revamp.m_member.nik_lookup_hash IS 'HMAC-SHA-256 blind index for exact lookup';
