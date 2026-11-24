import { Hono } from "hono";
import { z } from "zod";
import { rateLimit } from "../lib/rate-limit";
import { ok } from "../lib/response";
import { zValidate } from "../lib/validate";

const translateSchema = z.object({
  target: z.enum(["en", "id"]),
  texts: z.array(z.string().max(6000)).max(80),
});

const CACHE_LIMIT = 2000;
const cache = new Map<string, string>();

function setCache(key: string, value: string) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

async function translatePlainText(text: string, target: "en" | "id"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const key = `${target}:${trimmed}`;
  const cached = cache.get(key);
  if (cached !== undefined) return text.replace(trimmed, cached);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return text;
    const payload = (await res.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return text;
    const translated = (payload[0] as unknown[])
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
      .join("");
    if (!translated) return text;
    setCache(key, translated);
    return text.replace(trimmed, translated);
  } catch {
    return text;
  }
}

async function translateTextOrHtml(input: string, target: "en" | "id"): Promise<string> {
  if (!input.trim()) return input;

  // Jika mengandung tag HTML (blok rich-text), terjemahkan hanya segmen teks di luar tag.
  if (/<[a-z][\s\S]*>/i.test(input)) {
    const parts = input.split(/(<[^>]+>)/g);
    const translatedParts = await Promise.all(
      parts.map((part) => (part.startsWith("<") ? Promise.resolve(part) : translatePlainText(part, target))),
    );
    return translatedParts.join("");
  }

  return translatePlainText(input, target);
}

export const translateRoutes = new Hono();

translateRoutes.post(
  "/translate",
  rateLimit({ windowMs: 60_000, max: 60 }),
  zValidate(translateSchema),
  async (c) => {
    const { target, texts } = c.req.valid("json");
    const unique = Array.from(new Set(texts.filter((text) => text.trim() !== "")));
    const resolved = new Map<string, string>();

    // Jalankan dengan konkurensi terbatas supaya cepat tapi tidak membanjiri upstream.
    const CONCURRENCY = 6;
    for (let i = 0; i < unique.length; i += CONCURRENCY) {
      const slice = unique.slice(i, i + CONCURRENCY);
      const results = await Promise.all(slice.map((text) => translateTextOrHtml(text, target)));
      slice.forEach((orig, idx) => resolved.set(orig, results[idx]));
    }

    const translations = texts.map((text) => resolved.get(text) ?? text);
    return ok(c, { translations });
  },
);
