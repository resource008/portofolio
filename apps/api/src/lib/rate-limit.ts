import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getConnInfo } from "@hono/node-server/conninfo";
import { env } from "../env";
import { fail } from "./response";

/**
 * Client IP. `X-Forwarded-For` can be forged by the client, so it is only
 * trusted when the API runs behind a reverse proxy (`TRUST_PROXY=true`).
 */
export function clientIp(c: Context): string | null {
  if (env.trustProxy) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  try {
    return getConnInfo(c).remote.address ?? null;
  } catch {
    return null;
  }
}

/**
 * Fixed-window, in-memory rate limit per client IP. Good enough for a single
 * API instance; counters reset on restart and are not shared across instances.
 */
export function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, options.windowMs).unref();

  return createMiddleware(async (c, next) => {
    const key = clientIp(c) ?? "unknown";
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > options.max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return fail(c, options.message ?? "Terlalu banyak permintaan. Coba lagi nanti.", 429);
    }
    await next();
  });
}
