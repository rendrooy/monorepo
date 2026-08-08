import type { AuthTokenPayload } from "@monorepo/types";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { tableNames } from "../config";
import { pool } from "../connection/db";
import {
  discardTenantFile,
  type FileModule,
  storeTenantFile,
} from "../services/file-object-service";
import { runWithAuthContext } from "../utils/request-context";

interface LegacyFileRow {
  id: string;
  local_path: string;
  mime_type: string;
  original_name: null | string;
  tenant_id: string;
}

interface MigrationTarget {
  directory: string;
  fileIdColumn: string;
  label: string;
  module: FileModule;
  pathColumn: string;
  table: string;
}

const targets: MigrationTarget[] = [
  {
    directory: "payment-proofs",
    fileIdColumn: "proof_file_id",
    label: "IPL payment",
    module: "IPL_PAYMENT",
    pathColumn: "proof_path",
    table: tableNames.iplPayment,
  },
  {
    directory: "umkm-images",
    fileIdColumn: "image_file_id",
    label: "UMKM image",
    module: "UMKM_IMAGE",
    pathColumn: "image_path",
    table: tableNames.umkmRevision,
  },
  {
    directory: "umkm-payment-proofs",
    fileIdColumn: "proof_file_id",
    label: "UMKM payment",
    module: "UMKM_PAYMENT",
    pathColumn: "proof_path",
    table: tableNames.umkmSubscription,
  },
];

const extensionByMime: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const withTenantContext = <T>(tenantId: string, operation: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const auth: AuthTokenPayload = {
      identity_type: "TENANT",
      sub: randomUUID(),
      tenant_id: tenantId,
      user_id: randomUUID(),
    };
    runWithAuthContext(auth, () => operation().then(resolve, reject));
  });

const resolveLegacyPath = (directory: string, relativePath: string) => {
  const root = path.resolve(__dirname, "../../storage", directory);
  const absolute = path.resolve(root, relativePath);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Path file lokal keluar dari storage root");
  }
  return absolute;
};

const loadRows = async (target: MigrationTarget) => {
  const result = await pool.query<LegacyFileRow>(
    `SELECT id,tenant_id,${target.pathColumn} AS local_path,
       ${target.module === "UMKM_IMAGE" ? "image_original_name" : "proof_original_name"} AS original_name,
       ${target.module === "UMKM_IMAGE" ? "image_mime_type" : "proof_mime_type"} AS mime_type
     FROM ${target.table}
     WHERE tenant_id IS NOT NULL AND ${target.fileIdColumn} IS NULL
       AND ${target.pathColumn} IS NOT NULL AND is_deleted=false
     ORDER BY created_time`,
  );
  return result.rows;
};

const migrateRow = async (target: MigrationTarget, row: LegacyFileRow) =>
  withTenantContext(row.tenant_id, async () => {
    const extension = extensionByMime[row.mime_type];
    if (!extension)
      throw new Error(`MIME type tidak didukung: ${row.mime_type}`);
    const body = await readFile(
      resolveLegacyPath(target.directory, row.local_path),
    );
    const client = await pool.connect();
    let stored: Awaited<ReturnType<typeof storeTenantFile>> | null = null;
    try {
      await client.query("BEGIN");
      stored = await storeTenantFile(client, {
        body,
        extension,
        mimeType: row.mime_type,
        module: target.module,
        originalName: row.original_name || `file.${extension}`,
        uploadedById: null,
      });
      const updated = await client.query(
        `UPDATE ${target.table}
         SET ${target.fileIdColumn}=$2,${target.pathColumn}=$3,updated_time=now()
         WHERE id=$1 AND tenant_id=$4 AND ${target.fileIdColumn} IS NULL RETURNING id`,
        [row.id, stored.id, stored.objectKey, row.tenant_id],
      );
      if (!updated.rowCount) throw new Error("Record berubah selama migrasi");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      await discardTenantFile(stored).catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });

const run = async () => {
  const execute = process.argv.includes("--execute");
  let failed = 0;
  for (const target of targets) {
    const rows = await loadRows(target);
    process.stdout.write(`${target.label}: ${rows.length} file\n`);
    if (!execute) continue;
    for (const row of rows) {
      try {
        await migrateRow(target, row);
      } catch (error) {
        failed += 1;
        process.stderr.write(
          `${target.label} ${row.id} gagal: ${error instanceof Error ? error.message : "Unknown error"}\n`,
        );
      }
    }
  }
  if (!execute) {
    process.stdout.write(
      "Dry run selesai. Gunakan --execute setelah storage:check lulus.\n",
    );
  } else if (failed) {
    throw new Error(`${failed} file gagal dimigrasikan`);
  } else {
    process.stdout.write(
      "Migrasi file lokal selesai. Backup lokal tidak dihapus.\n",
    );
  }
};

run()
  .catch((error) => {
    process.stderr.write(`Migrasi file gagal: ${(error as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
