import { useCallback, useEffect, useMemo, useState } from "react";
import { apiSend } from "@/lib/api";
import { type Language, useLanguage } from "@/lib/language";

const SESSION_PREFIX = "auto-tr:v1:";
const memoryCache = new Map<string, string>();

function cacheKey(target: Language, text: string): string {
  return `${target}:${text}`;
}

function getCached(target: Language, text: string): string | undefined {
  const key = cacheKey(target, text);
  const hit = memoryCache.get(key);
  if (hit !== undefined) return hit;
  try {
    const stored = sessionStorage.getItem(SESSION_PREFIX + key);
    if (stored !== null) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch {
    // abaikan jika sessionStorage tidak tersedia
  }
  return undefined;
}

function setCached(target: Language, text: string, value: string): void {
  const key = cacheKey(target, text);
  memoryCache.set(key, value);
  try {
    sessionStorage.setItem(SESSION_PREFIX + key, value);
  } catch {
    // abaikan jika kuota penuh / mode privat
  }
}

interface PendingBatch {
  texts: Set<string>;
  resolvers: Array<() => void>;
  timer: number | null;
}

const pendingByLang = new Map<Language, PendingBatch>();

function flushBatch(target: Language) {
  const batch = pendingByLang.get(target);
  if (!batch) return;
  pendingByLang.delete(target);

  const list = Array.from(batch.texts);
  if (list.length === 0) {
    batch.resolvers.forEach((resolve) => resolve());
    return;
  }

  // API menerima maksimal 80 teks per batch; pecah jika lebih banyak.
  const chunks: string[][] = [];
  for (let i = 0; i < list.length; i += 60) {
    chunks.push(list.slice(i, i + 60));
  }

  Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await apiSend<{ translations: string[] }>("POST", "/translate", {
          target,
          texts: chunk,
        });
        chunk.forEach((orig, idx) => {
          const translated = res.translations[idx];
          if (typeof translated === "string") setCached(target, orig, translated);
        });
      } catch {
        // Jika gagal (mis. offline), tetap tampilkan teks asli.
      }
    }),
  ).finally(() => {
    batch.resolvers.forEach((resolve) => resolve());
  });
}

function enqueueTranslation(target: Language, texts: string[]): Promise<void> {
  const missing = texts.filter((text) => text.trim() !== "" && getCached(target, text) === undefined);
  if (missing.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let batch = pendingByLang.get(target);
    if (!batch) {
      batch = { texts: new Set(), resolvers: [], timer: null };
      pendingByLang.set(target, batch);
    }
    missing.forEach((text) => batch!.texts.add(text));
    batch.resolvers.push(resolve);
    if (batch.timer === null) {
      batch.timer = window.setTimeout(() => flushBatch(target), 35);
    }
  });
}

const MONTH_ID_TO_EN: Record<string, string> = {
  Januari: "January",
  Februari: "February",
  Maret: "March",
  April: "April",
  Mei: "May",
  Juni: "June",
  Juli: "July",
  Agustus: "August",
  September: "September",
  Oktober: "October",
  November: "November",
  Desember: "December",
  Sekarang: "Now",
  "Saat Ini": "Present",
};

export function translatePeriod(value: string | null | undefined, language: Language): string {
  if (!value) return "";
  if (language !== "en") return value;
  return value.replace(
    /\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Sekarang|Saat Ini)\b/gi,
    (match) => {
      const normalized = Object.keys(MONTH_ID_TO_EN).find(
        (key) => key.toLowerCase() === match.toLowerCase(),
      );
      return normalized ? MONTH_ID_TO_EN[normalized] : match;
    },
  );
}

/**
 * Terjemahkan kumpulan teks dinamis dari database secara otomatis saat bahasa = "en".
 * Mengembalikan fungsi `tr(text)` yang langsung memberi hasil terjemahan (atau teks asli sambil memuat).
 */
export function useAutoTranslate(texts: Array<string | null | undefined>): (text?: string | null) => string {
  const { language } = useLanguage();
  const [version, setVersion] = useState(0);

  const uniqueTexts = useMemo(() => {
    const set = new Set<string>();
    for (const item of texts) {
      if (item && item.trim() !== "") set.add(item);
    }
    return Array.from(set);
    // Bandingkan berdasarkan isi string agar tidak memicu ulang tanpa perubahan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texts.join("\u0000")]);

  useEffect(() => {
    if (language !== "en" || uniqueTexts.length === 0) return;
    let active = true;
    void enqueueTranslation("en", uniqueTexts).then(() => {
      if (active) setVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [language, uniqueTexts]);

  return useCallback(
    (text?: string | null) => {
      if (!text) return "";
      if (language !== "en") return text;
      return getCached("en", text) ?? text;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, version],
  );
}
