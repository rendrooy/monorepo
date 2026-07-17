export type GuestVisitStatus = "SUBMITTED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED";
export type GuestVehicleType = "CAR" | "MOTORCYCLE" | "OTHER";

export interface GuestVehicleInterface {
  id?: string | null;
  guest_visit_id?: string | null;
  plate_number?: string | null;
  vehicle_type?: GuestVehicleType | null;
  vehicle_brand?: string | null;
  vehicle_color?: string | null;
}

export interface GuestVisitInterface {
  id?: string | null;
  family_id?: string | null;
  family_no_kk?: string | null;
  family_address?: string | null;
  reported_by_id?: string | null;
  reporter_name?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  visit_purpose?: string | null;
  planned_arrival_time?: string | null;
  planned_departure_time?: string | null;
  status?: GuestVisitStatus | null;
  checked_in_time?: string | null;
  checked_out_time?: string | null;
  canceled_time?: string | null;
  vehicles?: GuestVehicleInterface[];
  search?: string | null;
  created_time?: string | null;
}

export interface GuestVisitActionRequest {
  id?: string | null;
}
