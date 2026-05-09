import { Pool } from "pg";
import { Sequelize } from "sequelize";
import { dbConnection } from "../config";
// import { operatorTypes } from "./query-builder";

// 🔹 Type config
interface DBConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

// 🔹 Ambil config
const config: DBConfig = dbConnection;

// 🔹 PG Pool
export const pool = new Pool({
  user: config.user,
  host: config.host,
  database: config.database,
  password: config.password,
  port: config.port || 5432,
});

// 🔹 Sequelize
export const sequelizeConnection = new Sequelize(
  config.database,
  config.user,
  config.password,
  {
    host: config.host,
    dialect: "postgres",
    port: config.port,
    timezone: "+07:00",
    define: {
      timestamps: false,
      schema: "homehub_revamp",
    },
  }
);