import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { pool } from "../connection/db";

const formatSqlForLog = (query: string) => query.replace(/\s+/g, " ").trim();

export const createQueryLogger = (scope: string) => {
  const logQuery = (label: string, query: string, values: unknown[] = []) => {
    console.info(`[${scope}] ${label} SQL:`, formatSqlForLog(query));
    if (values.length > 0) {
      console.info(`[${scope}] ${label} values:`, values);
    }
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
