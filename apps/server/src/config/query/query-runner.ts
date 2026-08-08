import { queryOption, buildConditionQuery, buildOrderQuery, OperatorTypes } from "./query-builder";
import type { Condition, QueryData } from "./query-builder";
import { resultMapper } from "./result-mapper";
import { pool } from "../../connection/db";
import { createQueryLogger } from "../../utils/query-logger";
import { tableNames } from "..";
import { getCurrentAuth } from "../../utils/request-context";
import { logger } from "../logger";
import { tenantScopedTableNames } from "../data-ownership";

const { logQuery } = createQueryLogger("query-runner");

const getTableScope = (tableName: string) => {
  const parts = tableName.trim().split(/\s+/);
  const qualifiedName = parts[0].replace(/"/g, "");
  const baseTable = qualifiedName.split(".").pop() || qualifiedName;
  const alias = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return { alias, baseTable };
};

const withTenantConditions = (tableName: string, conditions: Condition[] = []): Condition[] => {
  const auth = getCurrentAuth();
  const { alias, baseTable } = getTableScope(tableName);

  if (!auth || !tenantScopedTableNames.has(baseTable)) {
    return conditions;
  }

  if (!auth.tenant_id) {
    return [
      ...conditions,
      {
        column: alias ? `${alias}.tenant_id` : "tenant_id",
        operator: OperatorTypes.IS_NULL,
      },
    ];
  }

  return [
    ...conditions,
    {
      column: alias ? `${alias}.tenant_id` : "tenant_id",
      operator: OperatorTypes.EQUAL,
      value: auth.tenant_id,
    },
  ];
};

const withTenantOnWrite = (tableName: string, params: QueryData): QueryData => {
  const auth = getCurrentAuth();
  const { baseTable } = getTableScope(tableName);

  if (!auth || !tenantScopedTableNames.has(baseTable)) {
    return params;
  }

  return { ...params, tenant_id: auth.tenant_id ?? null };
};

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
  tableNames.financialTransaction,
  tableNames.guestVisit,
  tableNames.guestVehicle,
  tableNames.guestVisitHistory,
  tableNames.umkm,
  tableNames.umkmRevision,
]);

const withAuditOnInsert = (tableName: string, params: QueryData): QueryData => {
  const auth = getCurrentAuth();

  if (!auth?.user_id || auth.identity_type === "PLATFORM" || !auditedTables.has(tableName) || params.created_by_id) {
    return params;
  }

  return {
    ...params,
    created_by_id: auth.user_id,
  };
};

const withAuditOnUpdate = (tableName: string, params: QueryData): QueryData => {
  const auth = getCurrentAuth();

  if (!auth?.user_id || auth.identity_type === "PLATFORM" || !auditedTables.has(tableName) || params.updated_by_id) {
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

    const conditionQuery = buildConditionQuery(withTenantConditions(tableName, params.conditions));
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
    logger.error({ err, tableName }, "findQuery failed");
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
    const auditedParams = withTenantOnWrite(tableName, withAuditOnInsert(tableName, params));
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
    logger.error({ err: error, tableName }, "insertQuery failed");
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
    const scopedConditions = withTenantOnWrite(tableName, conditions);
    const setKeys = Object.keys(auditedParams);
    const whereEntries = Object.entries(scopedConditions);

    const setClause = setKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");

    const whereValues: unknown[] = [];
    const whereClause = whereEntries
      .map(([key, value]) => {
        if (value === null) return `${key} IS NULL`;
        whereValues.push(value);
        return `${key} = $${setKeys.length + whereValues.length}`;
      })
      .join(" AND ");

    const values = [
      ...Object.values(auditedParams),
      ...whereValues,
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
    logger.error({ err: error, tableName }, "updateQuery failed");
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
    const conditionQuery = buildConditionQuery(withTenantConditions(tableName, params.conditions));

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
    logger.error({ err, tableName }, "countQuery failed");
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
    const conditionQuery = buildConditionQuery(withTenantConditions(tableName, params.conditions));

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
    logger.error({ err: error, tableName }, "deleteQuery failed");
    return null;
  }
};
