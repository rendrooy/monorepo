import type { BaseRequest, MasterMemberInterface } from "@monorepo/types";
import { locales, tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import { getCurrentAuth } from "../utils/request-context";
import { createNikLookupHash, isMaskedNik, toNikStorage } from "../utils/nik-crypto";

const safeColumns = `id,name,address,phone,blood_type,sex,bod,boc,profession,religion,
  family_relation,family_id,created_time,updated_time,created_by_id,updated_by_id,is_deleted,
  CASE WHEN nik_last4 IS NULL THEN NULL ELSE '************' || nik_last4 END AS nik`;

const writableFields: (keyof MasterMemberInterface)[] = [
  "name", "address", "phone", "blood_type", "sex", "bod", "boc",
  "profession", "religion", "family_relation", "family_id",
];

const memberValues = (request: MasterMemberInterface) => Object.fromEntries(
  writableFields
    .filter((field) => request[field] !== undefined)
    .map((field) => [field, request[field] === "" ? null : request[field]]),
);

const databaseError = (error: unknown, fallback: string) => {
  const code = (error as { code?: string })?.code;
  return code === "23505"
    ? { status: 409, message: "NIK sudah terdaftar", data: null }
    : { status: 500, message: fallback, data: null };
};

export const getMemberService = async (request: MasterMemberInterface) => {
  try {
    const result = await pool.query<MasterMemberInterface>(
      `SELECT ${safeColumns} FROM ${tableNames.masterMember}
       WHERE id=$1 AND is_deleted=false LIMIT 1`,
      [request.id],
    );
    return result.rows[0]
      ? { status: 200, message: locales.request_success, data: result.rows[0] }
      : { status: 404, message: locales.resource_not_found, data: null };
  } catch (error) {
    logger.error({ err: error }, "Member lookup failed");
    return { status: 500, message: locales.unable_to_handle_request, data: null };
  }
};

export const loadMemberService = async (request: BaseRequest<MasterMemberInterface>) => {
  try {
    const params = request.params || {};
    const page = Math.max(Number(request.metadata?.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(request.metadata?.pageSize || 100), 1), 100);
    const values: unknown[] = [];
    const where = ["is_deleted=false"];
    if (params.name?.trim()) { values.push(`%${params.name.trim()}%`); where.push(`name ILIKE $${values.length}`); }
    if (params.religion?.trim()) { values.push(`%${params.religion.trim()}%`); where.push(`religion ILIKE $${values.length}`); }
    if (params.nik?.trim()) { values.push(createNikLookupHash(params.nik)); where.push(`nik_lookup_hash=$${values.length}`); }
    const clause = `WHERE ${where.join(" AND ")}`;
    const sortMap: Record<string, string> = { name: "name", nik: "nik_last4", religion: "religion", created_time: "created_time" };
    const sortBy = sortMap[request.metadata?.sortBy || "created_time"] || "created_time";
    const sortDir: "ASC" | "DESC" = request.metadata?.sortDir === "ASC" ? "ASC" : "DESC";
    const count = await pool.query(`SELECT COUNT(*) FROM ${tableNames.masterMember} ${clause}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const data = await pool.query<MasterMemberInterface>(
      `SELECT ${safeColumns} FROM ${tableNames.masterMember} ${clause}
       ORDER BY ${sortBy} ${sortDir} LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return { status: 200, message: locales.request_success, data: data.rows,
      metaData: { total: Number(count.rows[0]?.count || 0), page, pageSize, sortBy: request.metadata?.sortBy, sortDir } };
  } catch (error) {
    const message = error instanceof Error ? error.message : locales.unable_to_handle_request;
    return { status: 400, message, data: null };
  }
};

export const createMemberService = async (request: MasterMemberInterface) => {
  try {
    if (!request.nik || isMaskedNik(request.nik)) return { status: 400, message: "NIK wajib diisi", data: null };
    const values = { ...memberValues(request), ...toNikStorage(request.nik), created_by_id: getCurrentAuth()?.user_id };
    const columns = Object.keys(values);
    const result = await pool.query<MasterMemberInterface>(
      `INSERT INTO ${tableNames.masterMember}(${columns.join(",")})
       VALUES(${columns.map((_, index) => `$${index + 1}`).join(",")}) RETURNING id`,
      Object.values(values),
    );
    const saved = await getMemberService({ id: result.rows[0]?.id });
    return { ...saved, status: 201 };
  } catch (error) {
    logger.error({ err: error }, "Member creation failed");
    return databaseError(error, locales.unable_to_handle_request);
  }
};

export const updateMemberService = async (request: MasterMemberInterface) => {
  try {
    const values: Record<string, unknown> = { ...memberValues(request) };
    if (request.nik && !isMaskedNik(request.nik)) Object.assign(values, toNikStorage(request.nik));
    values.updated_time = new Date(); values.updated_by_id = getCurrentAuth()?.user_id;
    const columns = Object.keys(values);
    const result = await pool.query<{ id: string }>(
      `UPDATE ${tableNames.masterMember} SET ${columns.map((column, index) => `${column}=$${index + 1}`).join(",")}
       WHERE id=$${columns.length + 1} AND is_deleted=false RETURNING id`,
      [...Object.values(values), request.id],
    );
    return result.rows[0]
      ? getMemberService({ id: result.rows[0].id })
      : { status: 404, message: locales.resource_not_found, data: null };
  } catch (error) {
    logger.error({ err: error }, "Member update failed");
    return databaseError(error, locales.unable_to_handle_request);
  }
};

export const deleteMemberService = async (request: MasterMemberInterface) => {
  await pool.query(
    `UPDATE ${tableNames.masterMember} SET is_deleted=true,updated_time=now(),updated_by_id=$2 WHERE id=$1`,
    [request.id, getCurrentAuth()?.user_id],
  );
  return { status: 200, message: locales.delete_success };
};
