// Shared API response/domain types.

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  unread_count?: number;
  /** Projects listing: whether keyword search is enabled. */
  search_enabled?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Upload limits — single source of truth shared by the API and the web client
// so both reject the same files with the same message.

const MB = 1024 * 1024;

export const UPLOAD_LIMITS = {
  /** Images and documents (PNG, JPG, WEBP, GIF, PDF). */
  file: 5 * MB,
  /** Videos (MP4, WEBM, MOV). */
  video: 50 * MB,
} as const;

export const ALLOWED_UPLOAD_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** The maximum size allowed for a MIME type. */
export function maxUploadSize(mime: string): number {
  return mime.startsWith("video/") ? UPLOAD_LIMITS.video : UPLOAD_LIMITS.file;
}

/** Human-readable size, e.g. `5 MB`. */
export function formatUploadSize(bytes: number): string {
  return `${bytes / MB} MB`;
}

/** The upload rejection message for a MIME type. */
export function uploadSizeMessage(mime: string): string {
  return `Ukuran file maksimal ${formatUploadSize(maxUploadSize(mime))}.`;
}

/**
 * Validate a file before uploading so oversized and unsupported files are
 * rejected client-side instead of after a full upload.
 */
export function validateUpload(
  file: { size: number; type: string },
): { ok: true } | { ok: false; message: string } {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: "Tipe file tidak didukung. Gunakan PNG, JPG, WEBP, GIF, PDF, MP4, WEBM, atau MOV.",
    };
  }

  const max = maxUploadSize(file.type);
  if (file.size > max) {
    return { ok: false, message: uploadSizeMessage(file.type) };
  }

  return { ok: true };
}
