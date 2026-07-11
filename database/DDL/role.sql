CREATE TABLE m_role(
     id uuid NOT NULL DEFAULT gen_random_uuid(),
    name varchar(255),
    code varchar(255),
    created_time timestamp with time zone DEFAULT now(),
    updated_time timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean DEFAULT false,
    "desc" varchar(255),
    is_active boolean DEFAULT true ,
    PRIMARY KEY(id) 
);