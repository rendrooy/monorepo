import process from "node:process";

import { objectStorageConfig } from "../config";
import { getObjectStorage } from "../storage/supabase-object-storage";

const run = async () => {
  const storage = getObjectStorage();
  await storage.assertBucketAccess(objectStorageConfig.privateBucket);
  await storage.assertBucketAccess(objectStorageConfig.publicBucket);
  process.stdout.write(
    `Supabase Storage siap: ${objectStorageConfig.privateBucket}, ${objectStorageConfig.publicBucket}\n`,
  );
};

run().catch((error) => {
  process.stderr.write(
    `Pemeriksaan Supabase Storage gagal: ${error instanceof Error ? error.message : "Unknown error"}\n`,
  );
  process.exitCode = 1;
});
