import type { Request, RequestHandler } from "express";

import { getAuthPayload } from "./auth.middleware";

interface RateLimitOptions {
  key: (request: Request) => string;
  max: number;
  windowMs: number;
}

interface RateEntry { count: number; resetTime: number; }

const createRateLimit = ({ key, max, windowMs }: RateLimitOptions): RequestHandler => {
  const entries = new Map<string, RateEntry>();
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [entryKey, entry] of entries) if (entry.resetTime <= now) entries.delete(entryKey);
  }, Math.max(windowMs, 60_000));
  cleanup.unref();

  return (request, response, next) => {
    const now = Date.now();
    const entryKey = key(request);
    const current = entries.get(entryKey);
    const entry = !current || current.resetTime <= now
      ? { count: 0, resetTime: now + windowMs }
      : current;
    entry.count += 1;
    entries.set(entryKey, entry);
    response.setHeader("RateLimit-Limit", max);
    response.setHeader("RateLimit-Remaining", Math.max(0, max - entry.count));
    response.setHeader("RateLimit-Reset", Math.ceil(entry.resetTime / 1000));
    if (entry.count > max) {
      response.status(429).json({ data: null, message: "Terlalu banyak request. Silakan coba kembali.", status: 429 });
      return;
    }
    next();
  };
};

const clientIp = (request: Request) => request.ip || request.socket.remoteAddress || "unknown";

export const apiRateLimit = createRateLimit({
  key: (request) => `api:${clientIp(request)}`,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
});

export const authRateLimit = createRateLimit({
  key: (request) => `auth:${clientIp(request)}`,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60_000),
});

export const tenantApiRateLimit = createRateLimit({
  key: (request) => {
    const auth = getAuthPayload(request);
    return `tenant:${auth?.tenant_id || "unknown"}:user:${auth?.user_id || clientIp(request)}`;
  },
  max: Number(process.env.TENANT_RATE_LIMIT_MAX || 180),
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
});
