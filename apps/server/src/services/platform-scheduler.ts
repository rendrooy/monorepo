import { runtimeConfig } from "../config";
import { logger } from "../config/logger";
import { runSubscriptionJob } from "./platform-job-service";

let timer: NodeJS.Timeout | null = null;
let running = false;

const tick = async () => {
  if (running) return;
  running = true;
  try { await runSubscriptionJob(); }
  catch { /* The job runner persists and logs retry state. */ }
  finally { running = false; }
};

export const startPlatformScheduler = () => {
  if (!runtimeConfig.schedulerEnabled || timer) {
    logger.info({ enabled: runtimeConfig.schedulerEnabled }, "Platform scheduler state");
    return;
  }
  timer = setInterval(tick, runtimeConfig.schedulerPollMs);
  timer.unref();
  setTimeout(tick, 5_000).unref();
  logger.info({ pollMs: runtimeConfig.schedulerPollMs }, "Platform scheduler started");
};

export const stopPlatformScheduler = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
