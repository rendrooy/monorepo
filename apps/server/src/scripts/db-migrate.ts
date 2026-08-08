import type { PoolClient } from "pg";

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { dbConnection } from "../config";
import { pool } from "../connection/db";

interface AppliedMigration {
  checksum: string;
  filename: string;
  version: string;
}

type MigrationCommand = "apply" | "status" | "validate";

interface MigrationFile {
  checksum: string;
  filename: string;
  sql: string;
  version: string;
}

const migrationFilenamePattern = /^(\d{6})_([a-z0-9][a-z0-9_-]*)\.sql$/;

const quoteIdentifier = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`;

const assertIdentifier = (value: string, label: string): void => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error(`${label} tidak valid: ${value}`);
  }
};

const resolveMigrationDirectory = (): string => {
  const candidates = [
    resolve(process.cwd(), "database/migrations"),
    resolve(process.cwd(), "../../database/migrations"),
    resolve(__dirname, "../../../../database/migrations"),
  ];
  const directory = candidates.find((candidate) => existsSync(candidate));

  if (!directory) {
    throw new Error("Folder database/migrations tidak ditemukan");
  }

  return directory;
};

const loadMigrations = (): MigrationFile[] => {
  const directory = resolveMigrationDirectory();
  const filenames = readdirSync(directory)
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
  const versions = new Set<string>();

  return filenames.map((filename) => {
    const match = migrationFilenamePattern.exec(filename);

    if (!match) {
      throw new Error(`Nama migration tidak valid: ${filename}`);
    }

    const version = match[1];
    if (versions.has(version)) {
      throw new Error(`Version migration duplikat: ${version}`);
    }
    versions.add(version);

    const sql = readFileSync(resolve(directory, filename), "utf8").trim();
    if (!sql) {
      throw new Error(`Migration kosong: ${filename}`);
    }

    return {
      checksum: createHash("sha256").update(sql).digest("hex"),
      filename,
      sql,
      version,
    };
  });
};

const getHistoryTable = (): string => {
  assertIdentifier(dbConnection.schema, "DB_SCHEMA");
  return `${quoteIdentifier(dbConnection.schema)}.${quoteIdentifier("m_schema_migration")}`;
};

const ensureHistoryTable = async (client: PoolClient): Promise<void> => {
  assertIdentifier(dbConnection.schema, "DB_SCHEMA");
  await client.query(
    `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(dbConnection.schema)}`,
  );
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${getHistoryTable()} (
      version varchar(6) PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      checksum char(64) NOT NULL,
      applied_time timestamptz NOT NULL DEFAULT now()
    )
  `);
};

const readAppliedMigrations = async (
  client: PoolClient,
): Promise<AppliedMigration[]> => {
  const relation = `${dbConnection.schema}.m_schema_migration`;
  const exists = await client.query<{ relation: null | string }>(
    "SELECT to_regclass($1) AS relation",
    [relation],
  );

  if (!exists.rows[0]?.relation) {
    return [];
  }

  const result = await client.query<AppliedMigration>(
    `SELECT version,filename,checksum FROM ${getHistoryTable()} ORDER BY version`,
  );
  return result.rows;
};

const validateAppliedChecksums = (
  migrations: MigrationFile[],
  appliedMigrations: AppliedMigration[],
): void => {
  const availableByVersion = new Map(
    migrations.map((migration) => [migration.version, migration]),
  );

  for (const applied of appliedMigrations) {
    const available = availableByVersion.get(applied.version);
    if (!available) {
      throw new Error(
        `Migration yang sudah diterapkan tidak ditemukan di repository: ${applied.filename}`,
      );
    }
    if (
      available.filename !== applied.filename ||
      available.checksum !== applied.checksum.trim()
    ) {
      throw new Error(
        `Migration yang sudah diterapkan telah berubah: ${applied.filename}`,
      );
    }
  }
};

const printStatus = (
  migrations: MigrationFile[],
  appliedMigrations: AppliedMigration[],
): void => {
  const appliedVersions = new Set(
    appliedMigrations.map((migration) => migration.version),
  );

  for (const migration of migrations) {
    const status = appliedVersions.has(migration.version)
      ? "applied"
      : "pending";
    process.stdout.write(`${status.padEnd(8)} ${migration.filename}\n`);
  }

  process.stdout.write(
    `Total: ${migrations.length}, applied: ${appliedMigrations.length}, pending: ${migrations.length - appliedMigrations.length}\n`,
  );
};

const applyMigrations = async (
  client: PoolClient,
  migrations: MigrationFile[],
): Promise<void> => {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [
    `homehub:migrations:${dbConnection.schema}`,
  ]);

  try {
    await ensureHistoryTable(client);
    const appliedMigrations = await readAppliedMigrations(client);
    validateAppliedChecksums(migrations, appliedMigrations);
    const appliedVersions = new Set(
      appliedMigrations.map((migration) => migration.version),
    );

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO ${getHistoryTable()} (version,filename,checksum) VALUES ($1,$2,$3)`,
          [migration.version, migration.filename, migration.checksum],
        );
        await client.query("COMMIT");
        process.stdout.write(`applied  ${migration.filename}\n`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
      `homehub:migrations:${dbConnection.schema}`,
    ]);
  }
};

const parseCommand = (): MigrationCommand => {
  const command = process.argv[2] || "status";
  if (command !== "apply" && command !== "status" && command !== "validate") {
    throw new Error("Command harus apply, status, atau validate");
  }
  return command;
};

const run = async (): Promise<void> => {
  const command = parseCommand();
  const migrations = loadMigrations();

  if (command === "validate") {
    process.stdout.write(`Valid: ${migrations.length} migration file.\n`);
    return;
  }

  const client = await pool.connect();
  try {
    if (command === "apply") {
      await applyMigrations(client, migrations);
    }

    const appliedMigrations = await readAppliedMigrations(client);
    validateAppliedChecksums(migrations, appliedMigrations);
    printStatus(migrations, appliedMigrations);
  } finally {
    client.release();
  }
};

run()
  .catch((error) => {
    process.stderr.write(
      `Database migration gagal: ${error instanceof Error ? error.message : "Unknown error"}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
