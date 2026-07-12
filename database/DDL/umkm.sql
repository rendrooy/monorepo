CREATE TABLE homehub_revamp.m_umkm (
    id uuid NOT NULL DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES homehub_revamp.m_user(id),
    family_id uuid NOT NULL REFERENCES homehub_revamp.m_family(id), approved_revision_id uuid,
    status varchar(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','SUSPENDED')),
    created_time timestamp with time zone NOT NULL DEFAULT now(), updated_time timestamp with time zone,
    created_by_id uuid, updated_by_id uuid, is_deleted boolean NOT NULL DEFAULT false, PRIMARY KEY (id)
);

CREATE TABLE homehub_revamp.t_umkm_revision (
    id uuid NOT NULL DEFAULT gen_random_uuid(), umkm_id uuid NOT NULL REFERENCES homehub_revamp.m_umkm(id), version_no integer NOT NULL,
    name varchar(255) NOT NULL, category varchar(40) NOT NULL CHECK (category IN ('FOOD_BEVERAGE','GROCERY','FASHION','HEALTH_BEAUTY','SERVICE','CRAFT','ELECTRONIC','AUTOMOTIVE','AGRICULTURE','EDUCATION','PROPERTY','OTHER')),
    description varchar(1500) NOT NULL, address varchar(1000) NOT NULL, whatsapp varchar(30) NOT NULL, external_url varchar(1000),
    image_path varchar(1000) NOT NULL, image_original_name varchar(255) NOT NULL, image_mime_type varchar(100) NOT NULL, image_size integer NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','SUPERSEDED')),
    review_note varchar(1000), reviewed_time timestamp with time zone, reviewed_by_id uuid,
    created_time timestamp with time zone NOT NULL DEFAULT now(), updated_time timestamp with time zone,
    created_by_id uuid, updated_by_id uuid, is_deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (id), UNIQUE (umkm_id, version_no)
);

ALTER TABLE homehub_revamp.m_umkm ADD CONSTRAINT m_umkm_approved_revision_fkey FOREIGN KEY (approved_revision_id) REFERENCES homehub_revamp.t_umkm_revision(id);
CREATE UNIQUE INDEX uq_umkm_one_open_revision ON homehub_revamp.t_umkm_revision (umkm_id) WHERE status IN ('DRAFT','PENDING_REVIEW') AND is_deleted = false;
CREATE INDEX ix_umkm_owner ON homehub_revamp.m_umkm (owner_user_id, created_time DESC);
CREATE INDEX ix_umkm_revision_review ON homehub_revamp.t_umkm_revision (status, created_time DESC);
