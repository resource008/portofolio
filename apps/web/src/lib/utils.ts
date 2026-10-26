import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getLanguage } from "@/lib/language";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat(getLanguage() === "en" ? "en-US" : "id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} detik`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} mnt ${rest} dtk` : `${minutes} menit`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Ambil nama file dari URL, termasuk URL yang di-encode.
 */
export function fileNameFromUrl(url: string): string {
  return decodeURIComponent(url.split("/").pop() ?? "");
}

/**
 * Potong nama file panjang di tengah sambil mempertahankan ekstensi,
 * mis. "1791740-8f3a-4c2b-968.webp" -> "1791740...4c2b-968.webp".
 * Nama pendek dikembalikan apa adanya.
 */
export function truncateFileName(name: string, maxLength = 24): string {
  const clean = name.trim();
  if (clean.length <= maxLength) return clean;

  const dotIndex = clean.lastIndexOf(".");
  const extension = dotIndex > 0 ? clean.slice(dotIndex) : "";
  const base = dotIndex > 0 ? clean.slice(0, dotIndex) : clean;
  const keep = Math.max(6, maxLength - 3 - extension.length);

  if (keep >= base.length) return clean;

  const head = base.slice(0, Math.ceil(keep / 2));
  const tail = base.slice(-Math.floor(keep / 2));
  return `${head}...${tail}${extension}`;
}

/**
 * True jika nilai dokumen adalah file yang diunggah (path relatif atau URL blob
 * store), bukan tautan eksternal seperti URL kredensial.
 */
export function isDocumentFile(value: string): boolean {
  const doc = value.trim();
  if (!doc) return false;
  if (doc.startsWith("/")) return true;
  try {
    const host = new URL(doc).hostname;
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}