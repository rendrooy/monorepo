import type {
  BaseRequest,
  GuestVehicleInterface,
  GuestVisitInterface,
  GuestVisitStatus,
} from "@monorepo/types";
import type { PoolClient } from "pg";
import { tableNames } from "../config";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { hasMenuPermission, PERMISSION } from "../utils/rbac";

const REPORT_MENU = "OP_GUEST_REPORT";
const GATE_MENU = "SECURITY_GUEST_GATE";
const HISTORY_MENU = "SECURITY_GUEST_HISTORY";

const paging = (request: BaseRequest) => {
  const page = Math.max(Number(request.metadata?.page || 1), 1);
  const pageSize = Math.min(
    Math.max(Number(request.metadata?.pageSize || 10), 1),
    100,
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const getUserFamilyId = async (userId?: string | null) => {
  const result = await pool.query<{ family_id: string | null }>(
    `SELECT member.family_id FROM ${tableNames.masterUser} users
     LEFT JOIN ${tableNames.masterMember} member ON member.id=users.member_id
     WHERE users.id=$1 AND users.is_deleted=false`,
    [userId],
  );
  return result.rows[0]?.family_id || null;
};

const normalizeVehicles = (vehicles: GuestVehicleInterface[] = []) => {
  const normalized = vehicles.map((vehicle) => ({
    plate_number:
      vehicle.plate_number?.trim().toUpperCase().replace(/\s+/g, " ") || "",
    vehicle_type: vehicle.vehicle_type || "OTHER",
    vehicle_brand: vehicle.vehicle_brand?.trim() || null,
    vehicle_color: vehicle.vehicle_color?.trim() || null,
  }));
  if (normalized.some((vehicle) => !vehicle.plate_number))
    throw new Error("Plat nomor kendaraan wajib diisi");
  if (
    new Set(normalized.map((vehicle) => vehicle.plate_number)).size !==
    normalized.length
  ) {
    throw new Error("Plat nomor kendaraan tidak boleh duplikat");
  }
  return normalized;
};

const validateVisit = (request: GuestVisitInterface) => {
  if (
    !request.guest_name?.trim() ||
    !request.visit_purpose?.trim() ||
    !request.planned_arrival_time
  ) {
    throw new Error("Nama tamu, tujuan, dan waktu kedatangan wajib diisi");
  }
  const arrival = new Date(request.planned_arrival_time);
  const departure = request.planned_departure_time
    ? new Date(request.planned_departure_time)
    : null;
  if (
    Number.isNaN(arrival.getTime()) ||
    (departure && Number.isNaN(departure.getTime()))
  ) {
    throw new Error("Waktu kunjungan tidak valid");
  }
  if (departure && departure < arrival)
    throw new Error("Waktu selesai tidak boleh sebelum waktu kedatangan");
  return { arrival, departure, vehicles: normalizeVehicles(request.vehicles) };
};

const insertVehicles = async (
  client: PoolClient,
  visitId: string,
  vehicles: ReturnType<typeof normalizeVehicles>,
) => {
  for (const vehicle of vehicles) {
    await client.query(
      `INSERT INTO ${tableNames.guestVehicle}
       (guest_visit_id,plate_number,vehicle_type,vehicle_brand,vehicle_color,created_by_id)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [
        visitId,
        vehicle.plate_number,
        vehicle.vehicle_type,
        vehicle.vehicle_brand,
        vehicle.vehicle_color,
        getCurrentAuth()?.user_id,
      ],
    );
  }
};

const addHistory = (
  client: PoolClient,
  visitId: string,
  action: string,
  previous: string | null,
  current: string,
) =>
  client.query(
    `INSERT INTO ${tableNames.guestVisitHistory}
     (guest_visit_id,action,previous_status,current_status,created_by_id) VALUES($1,$2,$3,$4,$5)`,
    [visitId, action, previous, current, getCurrentAuth()?.user_id],
  );

const notifyGate = (client: PoolClient, visitId: string, guestName: string) =>
  client.query(
    `INSERT INTO ${tableNames.notification}(user_id,type,title,message,reference_id,reference_url,created_by_id)
   SELECT DISTINCT users.id,'GUEST_VISIT_SUBMITTED','Tamu akan datang',$2,$1::uuid,
     '/security/guest-gate',$3::uuid
   FROM ${tableNames.masterUser} users
   INNER JOIN ${tableNames.masterRoleMenuPermission} permission ON permission.role_id=users.role_id
   INNER JOIN ${tableNames.masterMenu} menu ON menu.id=permission.menu_id
   WHERE menu.code=$4 AND (permission.permission_mask & $5)=$5
     AND permission.is_active=true AND permission.is_deleted=false
     AND users.is_active=true AND users.is_deleted=false`,
    [
      visitId,
      `${guestName} telah dilaporkan dan akan berkunjung.`,
      getCurrentAuth()?.user_id,
      GATE_MENU,
      PERMISSION.READ,
    ],
  );

const notifyFamily = (
  client: PoolClient,
  familyId: string,
  visitId: string,
  type: string,
  title: string,
  message: string,
) =>
  client.query(
    `INSERT INTO ${tableNames.notification}(user_id,type,title,message,reference_id,reference_url,created_by_id)
   SELECT DISTINCT users.id,$3,$4,$5,$2::uuid,'/operation/guest',$6::uuid
   FROM ${tableNames.masterUser} users
   INNER JOIN ${tableNames.masterMember} member ON member.id=users.member_id
   WHERE member.family_id=$1 AND users.is_active=true AND users.is_deleted=false`,
    [familyId, visitId, type, title, message, getCurrentAuth()?.user_id],
  );

const vehicleSelect = `COALESCE(jsonb_agg(jsonb_build_object(
  'id',vehicle.id,'plate_number',vehicle.plate_number,'vehicle_type',vehicle.vehicle_type,
  'vehicle_brand',vehicle.vehicle_brand,'vehicle_color',vehicle.vehicle_color)
  ORDER BY vehicle.created_time) FILTER (WHERE vehicle.id IS NOT NULL AND vehicle.is_deleted=false),'[]'::jsonb) AS vehicles`;

const loadVisits = async (
  request: BaseRequest<GuestVisitInterface>,
  menuCode: string,
  familyId?: string | null,
) => {
  // if (!(await hasMenuPermission(menuCode, PERMISSION.READ))) {
  //   return {
  //     status: 403,
  //     message: "Anda tidak memiliki permission READ",
  //     data: [],
  //   };
  // }
  const { page, pageSize, offset } = paging(request);
  const params = request.params || {};
  const values: unknown[] = [];
  const where = ["visit.is_deleted=false"];
  if (familyId) {
    values.push(familyId);
    where.push(`visit.family_id=$${values.length}`);
  }
  if (params.status) {
    values.push(params.status);
    where.push(`visit.status=$${values.length}`);
  }
  if (params.search?.trim()) {
    values.push(`%${params.search.trim()}%`);
    where.push(`(visit.guest_name ILIKE $${values.length} OR family.no_kk ILIKE $${values.length}
      OR family.address ILIKE $${values.length} OR EXISTS(SELECT 1 FROM ${tableNames.guestVehicle} searched
      WHERE searched.guest_visit_id=visit.id AND searched.is_deleted=false AND searched.plate_number ILIKE $${values.length}))`);
  }
  const clause = `WHERE ${where.join(" AND ")}`;
  const joins = `INNER JOIN ${tableNames.masterFamily} family ON family.id=visit.family_id
    INNER JOIN ${tableNames.masterUser} reporter ON reporter.id=visit.reported_by_id`;
  const count = await pool.query(
    `SELECT COUNT(*) FROM ${tableNames.guestVisit} visit ${joins} ${clause}`,
    values,
  );
  values.push(pageSize, offset);
  const data = await pool.query<GuestVisitInterface>(
    `SELECT visit.*,family.no_kk AS family_no_kk,family.address AS family_address,
       reporter.username AS reporter_name,${vehicleSelect}
     FROM ${tableNames.guestVisit} visit ${joins}
     LEFT JOIN ${tableNames.guestVehicle} vehicle ON vehicle.guest_visit_id=visit.id AND vehicle.is_deleted=false
     ${clause} GROUP BY visit.id,family.no_kk,family.address,reporter.username
     ORDER BY visit.planned_arrival_time DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return {
    status: 200,
    message: "Request successful",
    data: data.rows,
    metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize },
  };
};

export const loadMyGuestVisitsService = async (
  request: BaseRequest<GuestVisitInterface>,
) => {
  // if (!(await hasMenuPermission(REPORT_MENU, PERMISSION.READ)))
  //   return {
  //     status: 403,
  //     message: "Anda tidak memiliki permission READ",
  //     data: [],
  //   };
  const familyId = await getUserFamilyId(getCurrentAuth()?.user_id);
  if (!familyId)
    return {
      status: 200,
      message: "Akun belum terhubung dengan keluarga",
      data: [],
      metaData: { total: 0, page: 1, pageSize: 10 },
    };
  return loadVisits(request, REPORT_MENU, familyId);
};

export const loadGuestGateService = (
  request: BaseRequest<GuestVisitInterface>,
) => loadVisits(request, GATE_MENU);
export const loadGuestHistoryService = (
  request: BaseRequest<GuestVisitInterface>,
) => loadVisits(request, HISTORY_MENU);

export const createGuestVisitService = async (request: GuestVisitInterface) => {
  // if (!(await hasMenuPermission(REPORT_MENU, PERMISSION.ADD)))
  //   return {
  //     status: 403,
  //     message: "Anda tidak memiliki permission ADD",
  //     data: null,
  //   };
  const familyId = await getUserFamilyId(getCurrentAuth()?.user_id);
  if (!familyId)
    return {
      status: 409,
      message: "Akun belum terhubung dengan keluarga",
      data: null,
    };
  const client = await pool.connect();
  try {
    const { arrival, departure, vehicles } = validateVisit(request);
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `INSERT INTO ${tableNames.guestVisit}
       (family_id,reported_by_id,guest_name,guest_phone,visit_purpose,planned_arrival_time,
        planned_departure_time,status,created_by_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,'SUBMITTED',$2) RETURNING id`,
      [
        familyId,
        getCurrentAuth()?.user_id,
        request.guest_name!.trim(),
        request.guest_phone?.trim() || null,
        request.visit_purpose!.trim(),
        arrival,
        departure,
      ],
    );
    const id = result.rows[0]!.id;
    await insertVehicles(client, id, vehicles);
    await addHistory(client, id, "SUBMITTED", null, "SUBMITTED");
    await notifyGate(client, id, request.guest_name!.trim());
    await client.query("COMMIT");
    return {
      status: 200,
      message: "Laporan tamu berhasil dibuat",
      data: { id },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 400,
      message: error instanceof Error ? error.message : "Gagal membuat laporan",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const updateGuestVisitService = async (request: GuestVisitInterface) => {
  // if (!(await hasMenuPermission(REPORT_MENU, PERMISSION.EDIT)))
  //   return {
  //     status: 403,
  //     message: "Anda tidak memiliki permission EDIT",
  //     data: null,
  //   };
  const familyId = await getUserFamilyId(getCurrentAuth()?.user_id);
  const client = await pool.connect();
  try {
    const { arrival, departure, vehicles } = validateVisit(request);
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE ${tableNames.guestVisit} SET guest_name=$3,guest_phone=$4,visit_purpose=$5,
       planned_arrival_time=$6,planned_departure_time=$7,updated_time=now(),updated_by_id=$2
       WHERE id=$1 AND family_id=$8 AND status='SUBMITTED' AND is_deleted=false RETURNING id`,
      [
        request.id,
        getCurrentAuth()?.user_id,
        request.guest_name!.trim(),
        request.guest_phone?.trim() || null,
        request.visit_purpose!.trim(),
        arrival,
        departure,
        familyId,
      ],
    );
    if (!result.rowCount) throw new Error("Laporan tidak dapat diubah");
    await client.query(
      `DELETE FROM ${tableNames.guestVehicle} WHERE guest_visit_id=$1`,
      [request.id],
    );
    await insertVehicles(client, request.id!, vehicles);
    await addHistory(client, request.id!, "UPDATED", "SUBMITTED", "SUBMITTED");
    await client.query("COMMIT");
    return {
      status: 200,
      message: "Laporan tamu berhasil diperbarui",
      data: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message:
        error instanceof Error ? error.message : "Gagal memperbarui laporan",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const cancelGuestVisitService = async (id?: string | null) => {
  // if (!(await hasMenuPermission(REPORT_MENU, PERMISSION.ACTION)))
  //   return {
  //     status: 403,
  //     message: "Anda tidak memiliki permission ACTION",
  //     data: null,
  //   };
  const familyId = await getUserFamilyId(getCurrentAuth()?.user_id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE ${tableNames.guestVisit} SET status='CANCELED',canceled_time=now(),canceled_by_id=$3,
       updated_time=now(),updated_by_id=$3 WHERE id=$1 AND family_id=$2 AND status='SUBMITTED'
       AND is_deleted=false RETURNING id`,
      [id, familyId, getCurrentAuth()?.user_id],
    );
    if (!result.rowCount) throw new Error("Laporan tidak dapat dibatalkan");
    await addHistory(client, id!, "CANCELED", "SUBMITTED", "CANCELED");
    await client.query("COMMIT");
    return { status: 200, message: "Laporan tamu dibatalkan", data: null };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message:
        error instanceof Error ? error.message : "Gagal membatalkan laporan",
      data: null,
    };
  } finally {
    client.release();
  }
};

const changeGateStatus = async (
  id: string | null | undefined,
  from: GuestVisitStatus,
  to: GuestVisitStatus,
) => {
  // if (!(await hasMenuPermission(GATE_MENU, PERMISSION.ACTION)))
  // return {
  //   status: 403,
  //   message: "Anda tidak memiliki permission ACTION",
  //   data: null,
  // };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const timeColumn =
      to === "CHECKED_IN" ? "checked_in_time" : "checked_out_time";
    const byColumn =
      to === "CHECKED_IN" ? "checked_in_by_id" : "checked_out_by_id";
    const result = await client.query<{
      family_id: string;
      guest_name: string;
    }>(
      `UPDATE ${tableNames.guestVisit} SET status=$2,${timeColumn}=now(),${byColumn}=$3,
       updated_time=now(),updated_by_id=$3 WHERE id=$1 AND status=$4 AND is_deleted=false
       RETURNING family_id,guest_name`,
      [id, to, getCurrentAuth()?.user_id, from],
    );
    const visit = result.rows[0];
    if (!visit)
      throw new Error(
        to === "CHECKED_IN"
          ? "Tamu tidak dapat di-check-in"
          : "Tamu tidak dapat di-check-out",
      );
    await addHistory(client, id!, to, from, to);
    await notifyFamily(
      client,
      visit.family_id,
      id!,
      `GUEST_${to}`,
      to === "CHECKED_IN" ? "Tamu telah masuk" : "Tamu telah keluar",
      `${visit.guest_name} ${to === "CHECKED_IN" ? "telah masuk ke lingkungan" : "telah meninggalkan lingkungan"}.`,
    );
    await client.query("COMMIT");
    return {
      status: 200,
      message:
        to === "CHECKED_IN"
          ? "Tamu berhasil check-in"
          : "Tamu berhasil check-out",
      data: null,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    return {
      status: 409,
      message: error instanceof Error ? error.message : "Aksi gerbang gagal",
      data: null,
    };
  } finally {
    client.release();
  }
};

export const checkInGuestService = (id?: string | null) =>
  changeGateStatus(id, "SUBMITTED", "CHECKED_IN");
export const checkOutGuestService = (id?: string | null) =>
  changeGateStatus(id, "CHECKED_IN", "CHECKED_OUT");
