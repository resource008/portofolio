import { useCallback, useEffect, useSyncExternalStore } from "react";
import { EN } from "@/lib/translations-en";

export type Language = "id" | "en";
export type LanguageScope = "public" | "admin";

const STORAGE_KEYS: Record<LanguageScope, string> = {
  public: "language:public",
  admin: "language:admin",
};
const listeners = new Set<() => void>();

function detectScope(): LanguageScope {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return "admin";
  }
  return "public";
}

function readStoredLanguage(scope: LanguageScope): Language {
  if (scope === "admin") return "id";
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[scope]);
    if (stored === "en" || stored === "id") return stored;
    return "id";
  } catch {
    return "id";
  }
}

const state: Record<LanguageScope, Language> =
  typeof window === "undefined"
    ? { public: "id", admin: "id" }
    : {
        public: readStoredLanguage("public"),
        admin: readStoredLanguage("admin"),
      };

export function getLanguage(scope: LanguageScope = detectScope()): Language {
  return state[scope];
}

export function setLanguage(language: Language, scope: LanguageScope = detectScope()): void {
  state[scope] = language;
  try {
    localStorage.setItem(STORAGE_KEYS[scope], language);
  } catch {
    // abaikan jika storage tidak tersedia
  }
  if (typeof document !== "undefined" && scope === detectScope()) {
    document.documentElement.lang = language;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function translate(
  text: string,
  vars?: Record<string, string | number>,
  language: Language = getLanguage(),
): string {
  const base = language === "en" ? (EN[text] ?? text) : text;
  if (!vars) return base;
  return base.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export function useLanguage(scope?: LanguageScope): {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
} {
  const resolvedScope = scope ?? detectScope();
  const language = useSyncExternalStore(
    subscribe,
    () => getLanguage(resolvedScope),
    () => "id" as Language,
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const updateLanguage = useCallback(
    (next: Language) => setLanguage(next, resolvedScope),
    [resolvedScope],
  );

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => translate(text, vars, language),
    [language],
  );
  return { language, setLanguage: updateLanguage, t };
}

if (typeof window !== "undefined") {
  document.documentElement.lang = getLanguage();
}
