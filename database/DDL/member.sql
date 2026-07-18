CREATE TABLE m_member(
     id uuid NOT NULL DEFAULT gen_random_uuid(),
    nik varchar(255),
    nik_ciphertext text,
    nik_iv varchar(32),
    nik_auth_tag varchar(32),
    nik_lookup_hash char(64),
    nik_last4 char(4),
    nik_key_version integer,
    name varchar(255),
    address varchar(255),
    phone varchar(255),
    blood_type varchar,
    sex varchar,
    bod timestamp with time zone,
    boc varchar(255),
    profession varchar(255),
    religion varchar,
    family_relation varchar(255),
    family_id uuid,
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean DEFAULT false ,
    PRIMARY KEY(id) ,
    CONSTRAINT chk_member_nik_plaintext_empty CHECK (nik IS NULL),
    CONSTRAINT m_member_family_id_fkey FOREIGN key(family_id) REFERENCES m_family(id) 
);

CREATE UNIQUE INDEX uq_member_nik_lookup_hash
    ON m_member(nik_lookup_hash)
    WHERE nik_lookup_hash IS NOT NULL AND is_deleted=false;
