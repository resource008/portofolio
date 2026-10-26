import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { PaginationMeta } from "@portofolio/shared";

export function ok<T>(
  c: Context,
  data: T,
  message?: string,
  status: ContentfulStatusCode = 200,
) {
  return c.json(
    {
      success: true as const,
      ...(message ? { message } : {}),
      data,
    },
    status,
  );
}

export function created<T>(c: Context, data: T, message?: string) {
  return ok(c, data, message, 201);
}

export function fail(
  c: Context,
  message: string,
  status: ContentfulStatusCode = 400,
  errors?: Record<string, string[]>,
) {
  return c.json(
    {
      success: false as const,
      message,
      ...(errors ? { errors } : {}),
    },
    status,
  );
}

export function paginated<T>(
  c: Context,
  data: T[],
  meta: PaginationMeta,
) {
  return c.json({ success: true as const, data, meta });
}
