import { queryOption, buildConditionQuery, buildOrderQuery } from "./query-builder";
import type { Condition, QueryData } from "./query-builder";
import { resultMapper } from "./result-mapper";
import { pool } from "../../connection/db";
import { createQueryLogger } from "../../utils/query-logger";
import { tableNames } from "..";
import { getCurrentAuth } from "../../utils/request-context";

const { logQuery } = createQueryLogger("query-runner");

const auditedTables = new Set<string>([
  tableNames.masterUser,
  tableNames.masterRole,
  tableNames.masterMenu,
  tableNames.masterRoleMenuPermission,
  tableNames.masterMember,
  tableNames.masterFamily,
  tableNames.iplBillBatch,
  tableNames.iplBill,
  tableNames.notification,
  tableNames.iplPayment,
  tableNames.iplFamilyCredit,
  tableNames.iplCreditLedger,
  tableNames.umkm,
  tableNames.umkmRevision,
]);

const withAuditOnInsert = (tableName: string, params: QueryData): QueryData => {
  const auth = getCurrentAuth();

  if (!auth?.user_id || !auditedTables.has(tableName) || params.created_by_id) {
    return params;
  }

  return {
    ...params,
    created_by_id: auth.user_id,
  };
};

const withAuditOnUpdate = (tableName: string, params: QueryData): QueryData => {
  const auth = getCurrentAuth();

  if (!auth?.user_id || !auditedTables.has(tableName) || params.updated_by_id) {
    return params;
  }

  return {
    ...params,
    updated_by_id: auth.user_id,
  };
};
/**
 * TYPES
 */
export interface JoinClause {
  type?: "INNER" | "LEFT" | "RIGHT";
  table: string;
  alias: string;
  on: string; // e.g. "u.role_id = r.id"
}

export interface FindParams {
  limit?: number;
  selectedColumns?: string;
  conditions?: Condition[];
  joins?: JoinClause[];
  offset?: number;
  order?: {
    order_by?: string;
    order_dir?: "ASC" | "DESC";
  };
}

/**
 * FIND MANY
 */
export const findQuery = async <T = unknown>(
  tableName: string,
  params: FindParams
): Promise<T[]> => {
  try {
    const limit = Number(params.limit || queryOption.limit);

    const conditionQuery = buildConditionQuery(params.conditions);
    const orderQuery = buildOrderQuery(params.order);
    const selectedColumns = params.selectedColumns || "*";

    const joinClause = (params.joins ?? [])
      .map((j) => `${j.type ?? "LEFT"} JOIN ${j.table} ${j.alias} ON ${j.on}`)
      .join("\n");

    const query = `
      SELECT ${selectedColumns}
      FROM ${tableName}
      ${joinClause}
      ${conditionQuery.bindQuery}
      ${orderQuery}
      LIMIT ${limit}
      OFFSET ${params.offset || 0}  
    `;

    const bindValues = conditionQuery.bindValues;

    logQuery("findQuery", query, bindValues);

    const result = await pool.query(query, bindValues);

    return (resultMapper(result) || []) as T[];
  } catch (err) {
    console.error("findQuery error:", err);
    return [];
  }
};

/**
 * FIND ONE
 */
export const findOneQuery = async <T = unknown>(
  tableName: string,
  params: FindParams
): Promise<T | null> => {
  const result = await findQuery<T>(tableName, {
    ...params,
    limit: 1,
  });

  return result[0] || null;
};

/**
 * INSERT
 */
export const insertQuery = async <T = unknown>(
  tableName: string,
  params: QueryData
): Promise<T | null> => {
  try {
    const auditedParams = withAuditOnInsert(tableName, params);
    const columns = Object.keys(auditedParams);
    const values = Object.values(auditedParams);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    logQuery("insertQuery", query, values);

    const result = await pool.query(query, values);

    return result.rows?.[0] || null;
  } catch (error) {
    console.error("insertQuery error:", error);
    return null;
  }
};

/**
 * UPDATE
 */
export const updateQuery = async <T = unknown>(
  tableName: string,
  params: QueryData,
  conditions: QueryData
): Promise<T | null> => {
  try {
    const auditedParams = withAuditOnUpdate(tableName, params);
    const setKeys = Object.keys(auditedParams);
    const whereKeys = Object.keys(conditions);

    const setClause = setKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");

    const whereClause = whereKeys
      .map(
        (key, i) => `${key} = $${setKeys.length + i + 1}`
      )
      .join(" AND ");

    const values = [
      ...Object.values(auditedParams),
      ...Object.values(conditions),
    ];

    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    logQuery("updateQuery", query, values);

    const result = await pool.query(query, values);

    return result.rows?.[0] || null;
  } catch (error) {
    console.error("updateQuery error:", error);
    return null;
  }
};

/**
 * COUNT
 */
export const countQuery = async (
  tableName: string,
  params: Pick<FindParams, "conditions" | "joins">
): Promise<number> => {
  try {
    const conditionQuery = buildConditionQuery(params.conditions);

    const joinClause = (params.joins ?? [])
      .map((j) => `${j.type ?? "LEFT"} JOIN ${j.table} ${j.alias} ON ${j.on}`)
      .join("\n");

    const query = `
      SELECT COUNT(*) AS total
      FROM ${tableName}
      ${joinClause}
      ${conditionQuery.bindQuery}
    `;

    logQuery("countQuery", query, conditionQuery.bindValues);

    const result = await pool.query(query, conditionQuery.bindValues);
    return parseInt(result.rows?.[0]?.total || "0", 10);
  } catch (err) {
    console.error("countQuery error:", err);
    return 0;
  }
};

/**
 * DELETE
 */
export const deleteQuery = async (
  tableName: string,
  params: { conditions?: Condition[] }
) => {
  try {
    const conditionQuery = buildConditionQuery(params.conditions);

    const query = `
      DELETE FROM ${tableName}
      ${conditionQuery.bindQuery}
    `;

    logQuery("deleteQuery", query, conditionQuery.bindValues);

    await pool.query(query, conditionQuery.bindValues);

    return {
      status: 200,
      message: "Delete Success",
    };
  } catch (error) {
    console.error("deleteQuery error:", error);
    return null;
  }
};
