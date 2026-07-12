import { mkdirSync } from "node:fs";
import path from "node:path";
import pino, { type Logger, type StreamEntry } from "pino";
import { getRequestContext } from "../utils/request-context";

const isDevelopment = process.env.NODE_ENV !== "production";
const logLevel = (process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info")) as pino.Level;
const logDirectory = path.resolve(process.cwd(), process.env.LOG_DIRECTORY || "logs");
const logToFile = process.env.LOG_TO_FILE !== "false";

mkdirSync(logDirectory, { recursive: true });

const streams: StreamEntry[] = [];
if (isDevelopment) {
  streams.push({
    level: logLevel,
    stream: pino.transport({
      target: "pino-pretty",
      options: { colorize: true, singleLine: false, translateTime: "SYS:standard" },
    }),
  });
} else {
  streams.push({ level: logLevel, stream: process.stdout });
}

if (logToFile) {
  streams.push({ level: "info", stream: pino.destination({ dest: path.join(logDirectory, "application.log"), mkdir: true, sync: false }) });
  streams.push({ level: "error", stream: pino.destination({ dest: path.join(logDirectory, "error.log"), mkdir: true, sync: false }) });
}

const options: pino.LoggerOptions = {
  level: logLevel,
  base: { service: "homehub-api" },
  redact: {
    paths: ["req.headers.authorization", "authorization", "password", "token", "accessToken", "proof_data", "image_data"],
    censor: "[REDACTED]",
  },
  mixin() {
    const context = getRequestContext();
    return {
      ...(context?.requestId ? { requestId: context.requestId } : {}),
      ...(context?.auth?.user_id ? { userId: context.auth.user_id, roleCode: context.auth.role_code } : {}),
    };
  },
};

export const logger: Logger = pino(options, pino.multistream(streams));

const queryStreams: StreamEntry[] = [{ level: logLevel, stream: pino.multistream(streams) }];
if (logToFile) {
  queryStreams.push({ level: "debug", stream: pino.destination({ dest: path.join(logDirectory, "query.log"), mkdir: true, sync: false }) });
}
export const queryLogger: Logger = pino({ ...options, base: { service: "homehub-api", scope: "database" } }, pino.multistream(queryStreams));

export const loggerConfig = {
  logSql: process.env.LOG_SQL !== "false" && isDevelopment,
  logSqlParams: process.env.LOG_SQL_PARAMS === "true",
  slowQueryMs: Number(process.env.SLOW_QUERY_MS || 1000),
};
