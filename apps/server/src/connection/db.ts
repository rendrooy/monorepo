import { Pool } from "pg";
import { Sequelize } from "sequelize";

import { dbConnection } from "../config";

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

export const pool = new Pool(
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
