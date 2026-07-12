import type { QueryResult } from "pg";
import { loggerConfig, queryLogger } from "../config/logger";

const normalizeSql = (value: unknown) => {
  const text = typeof value === "string" ? value : value && typeof value === "object" && "text" in value ? String(value.text) : "unknown";
  return text.replace(/\s+/g, " ").trim();
};

const sanitizeParams = (values: unknown[] = []) => values.map((value) => {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (typeof value === "string" && value.length > 120) return `[String ${value.length} chars]`;
  return value;
});

export const observeQuery = async <T extends QueryResult>(
  source: "pool" | "transaction",
  query: unknown,
  values: unknown[] | undefined,
  execute: () => Promise<T>,
): Promise<T> => {
  const started = performance.now();
  const sql = normalizeSql(query);
  try {
    const result = await execute();
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    const payload = {
      source,
      operation: sql.split(" ", 1)[0]?.toUpperCase() || "QUERY",
      durationMs,
      rowCount: result.rowCount,
      ...(loggerConfig.logSql ? { sql } : {}),
      ...(loggerConfig.logSqlParams ? { params: sanitizeParams(values) } : {}),
    };
    if (durationMs >= loggerConfig.slowQueryMs) queryLogger.warn(payload, "Slow query detected");
    else queryLogger.debug(payload, "Query completed");
    return result;
  } catch (error) {
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    const pgError = error as Error & { code?: string; detail?: string };
    queryLogger.error({ err: pgError, source, durationMs, code: pgError.code, detail: pgError.detail, ...(loggerConfig.logSql ? { sql } : {}) }, "Query failed");
    throw error;
  }
};
