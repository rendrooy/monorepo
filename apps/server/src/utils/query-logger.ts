import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { pool } from "../connection/db";
import { loggerConfig, queryLogger } from "../config/logger";

const formatSqlForLog = (query: string) => query.replace(/\s+/g, " ").trim();

export const createQueryLogger = (scope: string) => {
  const logQuery = (label: string, query: string, values: unknown[] = []) => {
    queryLogger.debug({ component: scope, operation: label, ...(loggerConfig.logSql ? { sql: formatSqlForLog(query) } : {}), ...(loggerConfig.logSqlParams ? { params: values } : {}) }, "Query prepared");
  };

  const poolQuery = async <T extends QueryResultRow = QueryResultRow>(
    label: string,
    query: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> => {
    logQuery(label, query, values);
    return values.length > 0 ? pool.query<T>(query, values) : pool.query<T>(query);
  };

  const clientQuery = async <T extends QueryResultRow = QueryResultRow>(
    client: PoolClient,
    label: string,
    query: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> => {
    logQuery(label, query, values);
    return values.length > 0 ? client.query<T>(query, values) : client.query<T>(query);
  };

  return {
    clientQuery,
    logQuery,
    poolQuery,
  };
};
