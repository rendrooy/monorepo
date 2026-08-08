import "../config";

import { pool } from "../connection/db";
import { reconcileTenantSubscriptions } from "../services/platform-billing-service";

const main = async () => {
  const generated = await reconcileTenantSubscriptions();
  process.stdout.write(`Subscription reconciliation selesai. Invoice baru: ${generated}\n`);
};

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
