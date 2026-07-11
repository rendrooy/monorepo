CREATE TABLE m_family(
     id uuid NOT NULL DEFAULT gen_random_uuid(),
    no_kk varchar(255),
    no_pbb varchar(255),
    address varchar(255),
    postal_code varchar(255),
    status_adm integer,
    status_dom integer,
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean DEFAULT false,
    is_active boolean DEFAULT true ,
    PRIMARY KEY(id) 
);