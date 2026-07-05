ALTER TABLE homehub_revamp.m_user
ADD COLUMN IF NOT EXISTS registration_status varchar(50) DEFAULT 'APPROVED',
ADD COLUMN IF NOT EXISTS approved_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by_id uuid,
ADD COLUMN IF NOT EXISTS rejected_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_by_id uuid,
ADD COLUMN IF NOT EXISTS rejection_note varchar(255),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

UPDATE homehub_revamp.m_user
SET registration_status = 'APPROVED'
WHERE registration_status IS NULL;

UPDATE homehub_revamp.m_user
SET is_active = true
WHERE is_active IS NULL;
