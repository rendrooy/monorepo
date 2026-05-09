import { queryOption, buildConditionQuery, buildOrderQuery } from "./query-builder";
import { resultMapper } from "./result-mapper";
import { pool } from "../../connection/db";
/**
 * TYPES
 */
export interface FindParams {
  limit?: number;
  selectedColumns?: string;
  conditions?: any[];
  order?: {
    order_by?: string;
    order_dir?: "ASC" | "DESC";
  };
}

export type QueryData = Record<string, any>;

/**
 * FIND MANY
 */
export const findQuery = async <T = any>(
  tableName: string,
  params: FindParams
): Promise<T[]> => {
  try {
    const limit = Number(params.limit || queryOption.limit);

    const conditionQuery = buildConditionQuery(params.conditions);
    const orderQuery = buildOrderQuery(params.order);
    const selectedColumns = params.selectedColumns || "*";

    const query = `
      SELECT ${selectedColumns}
      FROM ${tableName}
      ${conditionQuery.bindQuery}
      ${orderQuery}
      LIMIT ${limit}
    `;

    const bindValues = conditionQuery.bindValues;

    console.info("findQuery SQL:", query);
    console.info("bindValues:", bindValues);

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
export const findOneQuery = async <T = any>(
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
export const insertQuery = async <T = any>(
  tableName: string,
  params: QueryData
): Promise<T | null> => {
  try {
    const columns = Object.keys(params);
    const values = Object.values(params);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    const query = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING *
    `;

    console.info("insertQuery SQL:", query);
    console.info("values:", values);

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
export const updateQuery = async <T = any>(
  tableName: string,
  params: QueryData,
  conditions: QueryData
): Promise<T | null> => {
  try {
    const setKeys = Object.keys(params);
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
      ...Object.values(params),
      ...Object.values(conditions),
    ];

    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    console.info("updateQuery SQL:", query);
    console.info("values:", values);

    const result = await pool.query(query, values);

    return result.rows?.[0] || null;
  } catch (error) {
    console.error("updateQuery error:", error);
    return null;
  }
};

/**
 * DELETE
 */
export const deleteQuery = async (
  tableName: string,
  params: { conditions?: any[] }
) => {
  try {
    const conditionQuery = buildConditionQuery(params.conditions);

    const query = `
      DELETE FROM ${tableName}
      ${conditionQuery.bindQuery}
    `;

    console.info("deleteQuery SQL:", query);

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