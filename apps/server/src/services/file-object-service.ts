import type { PoolClient } from "pg";

import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { objectStorageConfig, tableNames } from "../config";
import { logger } from "../config/logger";
import { pool } from "../connection/db";
import { getObjectStorage } from "../storage/supabase-object-storage";
import { getCurrentAuth } from "../utils/request-context";
import { requireCurrentTenantId } from "../utils/tenant-scope";

export type FileModule =
  | "IPL_PAYMENT"
  | "PLATFORM_SUBSCRIPTION_PAYMENT"
  | "UMKM_IMAGE"
  | "UMKM_PAYMENT";

export interface StoredTenantFile {
  bucket: string;
  checksumSha256: string;
  id: string;
  mimeType: string;
  objectKey: string;
  originalName: string;
  size: number;
}

interface FileObjectRow {
  bucket: string;
  id: string;
  mime_type: string;
  object_key: string;
  original_name: string;
}

interface StoreTenantFileInput {
  body: Buffer;
  extension: string;
  mimeType: string;
  module: FileModule;
  originalName: string;
  uploadedById?: null | string;
  visibility?: "PRIVATE" | "PUBLIC";
}

const safeOriginalName = (value: string) =>
  path.posix.basename(value.replaceAll("\\", "/")).slice(0, 255) || "file";

export const storeTenantFile = async (
  client: PoolClient,
  input: StoreTenantFileInput,
): Promise<StoredTenantFile> => {
  const tenantId = requireCurrentTenantId();
  const extension = input.extension.toLowerCase();
  if (!/^[a-z0-9]+$/.test(extension))
    throw new Error("Ekstensi file tidak valid");

  const id = randomUUID();
  const visibility = input.visibility || "PRIVATE";
  const bucket =
    visibility === "PUBLIC"
      ? objectStorageConfig.publicBucket
      : objectStorageConfig.privateBucket;
  const objectKey = `tenants/${tenantId}/${input.module.toLowerCase()}/${id}/${randomUUID()}.${extension}`;
  const checksumSha256 = createHash("sha256").update(input.body).digest("hex");
  const originalName = safeOriginalName(input.originalName);
  const storage = getObjectStorage();

  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    `homehub:storage-quota:${tenantId}`,
  ]);
  const quotaResult = await client.query<{
    limit_value: string | null;
    usage_bytes: string;
  }>(
    `SELECT entitlement.limit_value,
            COALESCE((SELECT sum(file.size_bytes) FROM ${tableNames.fileObject} file
              WHERE file.tenant_id=$1 AND file.status='AVAILABLE' AND file.is_deleted=false),0) AS usage_bytes
     FROM ${tableNames.tenantSubscription} subscription
     INNER JOIN ${tableNames.platformPlanEntitlement} entitlement ON entitlement.plan_id=subscription.plan_id
     INNER JOIN ${tableNames.platformFeature} feature ON feature.id=entitlement.feature_id
     WHERE subscription.tenant_id=$1 AND subscription.status IN ('ACTIVE','SUSPENDED')
       AND subscription.is_deleted=false AND feature.code='STORAGE_LIMIT_BYTES'
     LIMIT 1`,
    [tenantId],
  );
  const quota = quotaResult.rows[0];
  if (!quota?.limit_value) throw new Error("Kuota storage tenant belum tersedia");
  if (Number(quota.usage_bytes) + input.body.length > Number(quota.limit_value)) {
    const error = new Error("Kuota storage tenant telah terlampaui") as Error & {
      status?: number;
    };
    error.status = 413;
    throw error;
  }

  await storage.putObject({
    body: input.body,
    bucket,
    checksumSha256,
    contentType: input.mimeType,
    key: objectKey,
  });

  try {
    await client.query(
      `INSERT INTO ${tableNames.fileObject}
       (id,tenant_id,provider,bucket,object_key,visibility,module,original_name,mime_type,
        size_bytes,checksum_sha256,uploaded_by_id)
       VALUES ($1,$2,'SUPABASE',$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        tenantId,
        bucket,
        objectKey,
        visibility,
        input.module,
        originalName,
        input.mimeType,
        input.body.length,
        checksumSha256,
        input.uploadedById === undefined
          ? getCurrentAuth()?.user_id || null
          : input.uploadedById,
      ],
    );
  } catch (error) {
    await storage
      .deleteObject({ bucket, key: objectKey })
      .catch((cleanupError) => {
        logger.error(
          { bucket, err: cleanupError, objectKey },
          "Orphan object cleanup failed",
        );
      });
    throw error;
  }

  return {
    bucket,
    checksumSha256,
    id,
    mimeType: input.mimeType,
    objectKey,
    originalName,
    size: input.body.length,
  };
};

export const discardTenantFile = async (file: null | StoredTenantFile) => {
  if (!file) return;
  await getObjectStorage().deleteObject({
    bucket: file.bucket,
    key: file.objectKey,
  });
};

export const getTenantFile = async (id?: null | string) => {
  if (!id) return null;
  const tenantId = requireCurrentTenantId();
  const result = await pool.query<FileObjectRow>(
    `SELECT id,bucket,object_key,original_name,mime_type
     FROM ${tableNames.fileObject}
     WHERE id=$1 AND tenant_id=$2 AND status='AVAILABLE' AND is_deleted=false`,
    [id, tenantId],
  );
  const file = result.rows[0];
  if (!file) return null;
  const body = await getObjectStorage().getObject({
    bucket: file.bucket,
    key: file.object_key,
  });
  return { body, mime: file.mime_type, name: file.original_name };
};

export const getTenantFileForPlatform = async (
  tenantId?: null | string,
  id?: null | string,
) => {
  if (!tenantId || !id) return null;
  const result = await pool.query<FileObjectRow>(
    `SELECT id,bucket,object_key,original_name,mime_type
     FROM ${tableNames.fileObject}
     WHERE id=$1 AND tenant_id=$2 AND status='AVAILABLE' AND is_deleted=false`,
    [id, tenantId],
  );
  const file = result.rows[0];
  if (!file) return null;
  const body = await getObjectStorage().getObject({
    bucket: file.bucket,
    key: file.object_key,
  });
  return { body, mime: file.mime_type, name: file.original_name };
};

export const deleteTenantFile = async (id?: null | string) => {
  if (!id) return;
  const tenantId = requireCurrentTenantId();
  const result = await pool.query<FileObjectRow>(
    `SELECT id,bucket,object_key,original_name,mime_type
     FROM ${tableNames.fileObject}
     WHERE id=$1 AND tenant_id=$2 AND status='AVAILABLE' AND is_deleted=false`,
    [id, tenantId],
  );
  const file = result.rows[0];
  if (!file) return;
  await getObjectStorage().deleteObject({
    bucket: file.bucket,
    key: file.object_key,
  });
  await pool.query(
    `UPDATE ${tableNames.fileObject}
     SET status='DELETED',is_deleted=true,deleted_time=now(),updated_time=now()
     WHERE id=$1 AND tenant_id=$2`,
    [id, tenantId],
  );
};
