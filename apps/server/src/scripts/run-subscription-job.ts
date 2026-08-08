import "../config";

import { pool } from "../connection/db";
import { runSubscriptionJob } from "../services/platform-job-service";

const main = async () => {
  const result = await runSubscriptionJob();
  const state = result.claimed ? "dijalankan" : "dilewati";
  process.stdout.write(
    `Subscription job ${state}. Invoice baru: ${result.generated}\n`,
  );
};

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
