import { Pool, type PoolClient } from "pg";
import { Sequelize } from "sequelize";

import { dbConnection } from "../config";
import { logger } from "../config/logger";
import { observeQuery } from "../utils/query-observer";

interface DBConfig {
  connectionString?: string;
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

const config: DBConfig = dbConnection;

const shouldUseSsl = (connectionString?: string): boolean => {
  if (process.env.DB_SSL === "true") {
    return true;
  }

  if (!connectionString) {
    return false;
  }

  return connectionString.includes("sslmode=require") || connectionString.includes("supabase");
};

const sslConfig = shouldUseSsl(config.connectionString)
  ? { rejectUnauthorized: false }
  : undefined;

const rawPool = new Pool(
  config.connectionString
    ? {
        connectionString: config.connectionString,
        ssl: sslConfig,
      }
    : {
        user: config.user,
        host: config.host,
        database: config.database,
        password: config.password,
        port: config.port || 5432,
      }
);

const instrumentClient = (client: PoolClient): PoolClient => new Proxy(client, {
  get(target, property, receiver) {
    if (property === "query") {
      return (query: unknown, values?: unknown[]) => observeQuery(
        "transaction",
        query,
        values,
        () => target.query(query as never, values as never) as unknown as Promise<any>,
      );
    }
    const value = Reflect.get(target, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export const pool: Pool = new Proxy(rawPool, {
  get(target, property, receiver) {
    if (property === "query") {
      return (query: unknown, values?: unknown[]) => observeQuery(
        "pool",
        query,
        values,
        () => target.query(query as never, values as never) as unknown as Promise<any>,
      );
    }
    if (property === "connect") {
      return async () => instrumentClient(await target.connect());
    }
    const value = Reflect.get(target, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
}) as Pool;

rawPool.on("error", (error) => logger.error({ err: error }, "Unexpected PostgreSQL pool error"));

const sequelizeOptions = {
  dialect: "postgres" as const,
  timezone: "+07:00",
  define: {
    timestamps: false,
    schema: "homehub_revamp",
  },
  ...(sslConfig
    ? {
        dialectOptions: {
          ssl: {
            require: true,
            ...sslConfig,
          },
        },
      }
    : {}),
};

export const sequelizeConnection = config.connectionString
  ? new Sequelize(config.connectionString, sequelizeOptions)
  : new Sequelize(config.database, config.user, config.password, {
      ...sequelizeOptions,
      host: config.host,
      port: config.port,
    });
