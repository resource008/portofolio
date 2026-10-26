import { useCallback, useSyncExternalStore } from "react";
import { EN } from "@/lib/translations-en";

export type Language = "id" | "en";

const STORAGE_KEY = "language";
const listeners = new Set<() => void>();

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

let current: Language = typeof window === "undefined" ? "id" : readStoredLanguage();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language): void {
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // abaikan jika storage tidak tersedia
  }
  document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Terjemahkan teks: teks sumber ditulis dalam bahasa Indonesia, dan versi
 * Inggrisnya diambil dari kamus `EN`. Placeholder `{nama}` diisi dari `vars`.
 */
export function translate(
  text: string,
  vars?: Record<string, string | number>,
  language: Language = current,
): string {
  const base = language === "en" ? (EN[text] ?? text) : text;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export function useLanguage(): {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
} {
  const language = useSyncExternalStore(subscribe, getLanguage, () => "id" as Language);
  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => translate(text, vars, language),
    [language],
  );
  return { language, setLanguage, t };
}

if (typeof window !== "undefined") {
  document.documentElement.lang = current;
}
