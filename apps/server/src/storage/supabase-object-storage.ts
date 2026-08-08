import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type {
  GetObjectInput,
  ObjectStorage,
  PutObjectInput,
} from "./object-storage";

import { objectStorageConfig } from "../config";

const requiredConfig = () => {
  const missing = Object.entries({
    SUPABASE_STORAGE_ACCESS_KEY_ID: objectStorageConfig.accessKeyId,
    SUPABASE_STORAGE_ENDPOINT: objectStorageConfig.endpoint,
    SUPABASE_STORAGE_REGION: objectStorageConfig.region,
    SUPABASE_STORAGE_SECRET_ACCESS_KEY: objectStorageConfig.secretAccessKey,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      `Konfigurasi Supabase Storage belum lengkap: ${missing.join(", ")}`,
    );
  }
};

export class SupabaseObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor() {
    requiredConfig();
    this.client = new S3Client({
      credentials: {
        accessKeyId: objectStorageConfig.accessKeyId,
        secretAccessKey: objectStorageConfig.secretAccessKey,
      },
      endpoint: objectStorageConfig.endpoint,
      forcePathStyle: true,
      region: objectStorageConfig.region,
    });
  }

  async assertBucketAccess(bucket: string) {
    await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
  }

  async deleteObject(input: GetObjectInput) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
    );
  }

  async getObject(input: GetObjectInput) {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
    );
    if (!result.Body)
      throw new Error("Object Storage tidak mengembalikan isi file");
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async putObject(input: PutObjectInput) {
    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: input.bucket,
        ContentType: input.contentType,
        Key: input.key,
        Metadata: { sha256: input.checksumSha256 },
      }),
    );
  }
}

let storage: ObjectStorage | undefined;

export const getObjectStorage = (): ObjectStorage => {
  storage ??= new SupabaseObjectStorage();
  return storage;
};
