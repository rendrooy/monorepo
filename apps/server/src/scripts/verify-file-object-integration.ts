import type { AuthTokenPayload } from "@monorepo/types";

import { randomUUID } from "node:crypto";
import process from "node:process";

import { tableNames } from "../config";
import { pool } from "../connection/db";
import {
  deleteTenantFile,
  discardTenantFile,
  getTenantFile,
  storeTenantFile,
} from "../services/file-object-service";
import { runWithAuthContext } from "../utils/request-context";

const withTenant = <T>(tenantId: string, operation: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const userId = randomUUID();
    const auth: AuthTokenPayload = {
      identity_type: "TENANT",
      sub: userId,
      tenant_id: tenantId,
      user_id: userId,
    };
    runWithAuthContext(auth, () => operation().then(resolve, reject));
  });

const run = async () => {
  const suffix = randomUUID().slice(0, 8);
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let file: Awaited<ReturnType<typeof storeTenantFile>> | null = null;

  try {
    await pool.query(
      `INSERT INTO ${tableNames.tenant} (id,code,slug,name)
       VALUES ($1,$2,$3,$4),($5,$6,$7,$8)`,
      [
        tenantA,
        `FILE-A-${suffix}`,
        `file-a-${suffix}`,
        `File Test A ${suffix}`,
        tenantB,
        `FILE-B-${suffix}`,
        `file-b-${suffix}`,
        `File Test B ${suffix}`,
      ],
    );

    file = await withTenant(tenantA, async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const stored = await storeTenantFile(client, {
          body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          extension: "png",
          mimeType: "image/png",
          module: "UMKM_IMAGE",
          originalName: "tenant-check.png",
          uploadedById: null,
        });
        await client.query("COMMIT");
        return stored;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });

    const fileId = file.id;
    const ownFile = await withTenant(tenantA, () => getTenantFile(fileId));
    const foreignFile = await withTenant(tenantB, () =>
      getTenantFile(fileId),
    );
    if (!ownFile?.body.length || foreignFile) {
      throw new Error("Tenant file ownership check failed");
    }

    await withTenant(tenantA, () => deleteTenantFile(fileId));
    file = null;
    process.stdout.write("Tenant-scoped file integration test passed\n");
  } finally {
    if (file) await discardTenantFile(file).catch(() => undefined);
    await pool.query(
      `DELETE FROM ${tableNames.fileObject} WHERE tenant_id=ANY($1::uuid[])`,
      [[tenantA, tenantB]],
    );
    await pool.query(
      `DELETE FROM ${tableNames.tenant} WHERE id=ANY($1::uuid[])`,
      [[tenantA, tenantB]],
    );
    await pool.end();
  }
};

run().catch((error) => {
  process.stderr.write(
    `Tenant-scoped file integration test failed: ${error instanceof Error ? error.message : "Unknown error"}\n`,
  );
  process.exitCode = 1;
});
