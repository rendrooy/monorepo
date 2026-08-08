import type { PoolClient } from "pg";

import { dbConnection } from "../config";
import {
  dataOwnership,
  getClassifiedTableNames,
} from "../config/data-ownership";
import { pool } from "../connection/db";

interface DatabaseTarget {
  database_name: string;
  schema_name: string;
}

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`;

const readDatabaseTarget = async (
  client: PoolClient,
): Promise<DatabaseTarget> => {
  const result = await client.query<DatabaseTarget>(
    "SELECT current_database() AS database_name,$1::text AS schema_name",
    [dbConnection.schema],
  );
  const target = result.rows[0];

  if (!target) {
    throw new Error("Target database tidak dapat dibaca");
  }

  return target;
};

const readSchemaTables = async (client: PoolClient): Promise<string[]> => {
  const result = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename",
    [dbConnection.schema],
  );
  return result.rows.map((row) => row.tablename);
};

const printList = (label: string, values: string[]): void => {
  process.stdout.write(
    `${label} (${values.length}):${values.length ? `\n- ${values.join("\n- ")}` : " none"}\n`,
  );
};

const assertExecutionAllowed = (target: DatabaseTarget): void => {
  const expectedConfirmation = `TRUNCATE:${target.database_name}:${target.schema_name}`;

  if (process.env.RESET_TARGET_DB !== target.database_name) {
    throw new Error(
      "RESET_TARGET_DB harus sama persis dengan current_database()",
    );
  }
  if (process.env.RESET_TENANT_DATA_CONFIRM !== expectedConfirmation) {
    throw new Error(
      `RESET_TENANT_DATA_CONFIRM harus bernilai ${expectedConfirmation}`,
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_TENANT_RESET !== "true"
  ) {
    throw new Error(
      "Production reset membutuhkan ALLOW_PRODUCTION_TENANT_RESET=true",
    );
  }
};

const truncateTenantTables = async (
  client: PoolClient,
  tableNames: string[],
): Promise<void> => {
  if (!tableNames.length) {
    process.stdout.write(
      "Tidak ada tabel tenant-owned yang perlu di-truncate.\n",
    );
    return;
  }

  const qualifiedTables = tableNames
    .map(
      (tableName) =>
        `${quoteIdentifier(dbConnection.schema)}.${quoteIdentifier(tableName)}`,
    )
    .join(",");

  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `homehub:tenant-reset:${dbConnection.schema}`,
    ]);
    await client.query(`TRUNCATE TABLE ${qualifiedTables} RESTART IDENTITY`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const run = async (): Promise<void> => {
  const execute = process.argv.includes("--execute");
  const client = await pool.connect();

  try {
    const target = await readDatabaseTarget(client);
    const existingTables = await readSchemaTables(client);
    const existingTableSet = new Set(existingTables);
    const classifiedTables = getClassifiedTableNames();
    const unclassifiedTables = existingTables.filter(
      (tableName) => !classifiedTables.has(tableName),
    );
    const tenantTables = dataOwnership.tenantOwned.filter((tableName) =>
      existingTableSet.has(tableName),
    );
    const missingTenantTables = dataOwnership.tenantOwned.filter(
      (tableName) => !existingTableSet.has(tableName),
    );

    process.stdout.write(
      `Target: ${target.database_name}.${target.schema_name}\n`,
    );
    printList("Tenant-owned existing", [...tenantTables]);
    printList("Tenant-owned belum tersedia", [...missingTenantTables]);
    printList("Tabel belum diklasifikasikan", unclassifiedTables);

    if (unclassifiedTables.length) {
      throw new Error(
        "Reset dibatalkan karena terdapat tabel yang belum diklasifikasikan",
      );
    }

    if (!execute) {
      process.stdout.write("Dry run selesai. Tidak ada data yang diubah.\n");
      return;
    }

    assertExecutionAllowed(target);
    await truncateTenantTables(client, [...tenantTables]);
    process.stdout.write(
      `Reset selesai: ${tenantTables.length} tabel tenant-owned di-truncate.\n`,
    );
  } finally {
    client.release();
  }
};

run()
  .catch((error) => {
    process.stderr.write(
      `Reset data tenant gagal: ${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
