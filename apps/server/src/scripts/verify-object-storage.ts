import { createHash, randomUUID } from "node:crypto";
import process from "node:process";

import { objectStorageConfig } from "../config";
import { getObjectStorage } from "../storage/supabase-object-storage";

const run = async () => {
  const storage = getObjectStorage();
  const body = Buffer.from(`homehub-storage-check:${randomUUID()}`, "utf8");
  const key = `healthchecks/${randomUUID()}.txt`;
  const input = { bucket: objectStorageConfig.privateBucket, key };

  try {
    await storage.putObject({
      ...input,
      body,
      checksumSha256: createHash("sha256").update(body).digest("hex"),
      contentType: "text/plain",
    });
    const downloaded = await storage.getObject(input);
    if (!downloaded.equals(body)) {
      throw new Error("Isi object hasil download tidak sesuai");
    }
    process.stdout.write(
      "Supabase Storage upload/download smoke test passed\n",
    );
  } finally {
    await storage.deleteObject(input).catch(() => undefined);
  }
};

run().catch((error) => {
  process.stderr.write(
    `Supabase Storage smoke test failed: ${error instanceof Error ? error.message : "Unknown error"}\n`,
  );
  process.exitCode = 1;
});
