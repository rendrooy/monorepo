import * as http from "node:http";

import "./config";
import app from "./app";
import { runtimeConfig } from "./config";
import { logger } from "./config/logger";
import { pool } from "./connection/db";
import { startPlatformScheduler, stopPlatformScheduler } from "./services/platform-scheduler";

const port = Number(process.env.PORT || 3001);

const init = async (): Promise<void> => {
  const server = http.createServer(app);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");
    stopPlatformScheduler();
    const timeout = setTimeout(() => {
      logger.fatal("Graceful shutdown timed out");
      process.exit(1);
    }, runtimeConfig.shutdownTimeoutMs);
    timeout.unref();
    server.close(async (error) => {
      if (error) logger.error({ err: error }, "HTTP server close failed");
      await pool.end().catch((poolError) => logger.error({ err: poolError }, "Database pool close failed"));
      clearTimeout(timeout);
      process.exit(error ? 1 : 0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  server.listen(port, "::", () => {
    logger.info({ port }, "API HTTP server started");
    startPlatformScheduler();
  });
};

init().catch((error) => {
  logger.fatal({ err: error }, "API startup failed");
  process.exitCode = 1;
});
