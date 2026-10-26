import { zValidator } from "@hono/zod-validator";
import { z, type ZodSchema } from "zod";

const SAFE_URL_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/** Whether a URL has no scheme or a safe one (blocks `javascript:`, `data:`, …). */
export function isSafeUrl(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000- \u007f]/g, "").toLowerCase();
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/)?.[1];
  return !scheme || SAFE_URL_SCHEMES.has(scheme);
}

/** Non-empty string that is safe to render as a link or media source. */
export const safeUrl = () =>
  z.string().trim().min(1).refine(isSafeUrl, "URL tidak valid atau skemanya tidak diizinkan.");

/**
 * Zod-validator wrapper that converts validation failures into the app's
 * standard error envelope (`{ success: false, message, errors }`) instead of
 * Hono's default `{ error: { issues } }`, so clients can render per-field
 * errors through `ApiError.errors`.
 */
export function zValidate<T extends ZodSchema>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString() ?? "_";
        (errors[field] ??= []).push(issue.message);
      }
      return c.json(
        { success: false, message: "Data tidak valid.", errors },
        400,
      );
    }
  });
}