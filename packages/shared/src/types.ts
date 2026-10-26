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
  file: 5 * MB,
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

export function maxUploadSize(mime: string): number {
  return mime.startsWith("video/") ? UPLOAD_LIMITS.video : UPLOAD_LIMITS.file;
}

export function formatUploadSize(bytes: number): string {
  return `${bytes / MB} MB`;
}

export function uploadSizeMessage(mime: string): string {
  return `Ukuran file maksimal ${formatUploadSize(maxUploadSize(mime))}.`;
}

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
