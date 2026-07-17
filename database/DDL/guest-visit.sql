CREATE TABLE IF NOT EXISTS homehub_revamp.t_guest_visit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES homehub_revamp.m_family(id),
    reported_by_id uuid NOT NULL REFERENCES homehub_revamp.m_user(id),
    guest_name varchar(255) NOT NULL,
    guest_phone varchar(50),
    visit_purpose varchar(500) NOT NULL,
    planned_arrival_time timestamptz NOT NULL,
    planned_departure_time timestamptz,
    status varchar(20) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED','CHECKED_IN','CHECKED_OUT','CANCELED')),
    checked_in_time timestamptz,
    checked_in_by_id uuid REFERENCES homehub_revamp.m_user(id),
    checked_out_time timestamptz,
    checked_out_by_id uuid REFERENCES homehub_revamp.m_user(id),
    canceled_time timestamptz,
    canceled_by_id uuid REFERENCES homehub_revamp.m_user(id),
    created_time timestamptz NOT NULL DEFAULT now(),
    updated_time timestamptz,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    CHECK (planned_departure_time IS NULL OR planned_departure_time >= planned_arrival_time)
);

CREATE TABLE IF NOT EXISTS homehub_revamp.t_guest_vehicle (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_visit_id uuid NOT NULL REFERENCES homehub_revamp.t_guest_visit(id),
    plate_number varchar(30) NOT NULL,
    vehicle_type varchar(30) NOT NULL CHECK (vehicle_type IN ('CAR','MOTORCYCLE','OTHER')),
    vehicle_brand varchar(100),
    vehicle_color varchar(100),
    created_time timestamptz NOT NULL DEFAULT now(),
    updated_time timestamptz,
    created_by_id uuid,
    updated_by_id uuid,
    is_deleted boolean NOT NULL DEFAULT false,
    CONSTRAINT uq_guest_vehicle_plate UNIQUE (guest_visit_id, plate_number)
);

CREATE TABLE IF NOT EXISTS homehub_revamp.t_guest_visit_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_visit_id uuid NOT NULL REFERENCES homehub_revamp.t_guest_visit(id),
    action varchar(30) NOT NULL CHECK (action IN ('SUBMITTED','UPDATED','CHECKED_IN','CHECKED_OUT','CANCELED')),
    previous_status varchar(20),
    current_status varchar(20) NOT NULL,
    note varchar(500),
    created_time timestamptz NOT NULL DEFAULT now(),
    created_by_id uuid
);

CREATE INDEX IF NOT EXISTS ix_guest_visit_family ON homehub_revamp.t_guest_visit(family_id, created_time DESC);
CREATE INDEX IF NOT EXISTS ix_guest_visit_status ON homehub_revamp.t_guest_visit(status, planned_arrival_time);
CREATE INDEX IF NOT EXISTS ix_guest_vehicle_plate ON homehub_revamp.t_guest_vehicle(plate_number);
CREATE INDEX IF NOT EXISTS ix_guest_visit_history_visit ON homehub_revamp.t_guest_visit_history(guest_visit_id, created_time DESC);
