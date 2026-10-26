import { randomUUID } from "node:crypto";
import path from "node:path";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  ALLOWED_UPLOAD_TYPES,
  UPLOAD_LIMITS,
  maxUploadSize,
  uploadSizeMessage,
} from "@portofolio/shared";
import { sql } from "../db/client";
import { requireAdmin } from "../middleware/auth";
import { fail, ok } from "../lib/response";
import {
  deleteObject,
  getObjectUrl,
  isKeyValid,
  listObjects,
  uploadBlob,
} from "../lib/storage";

export const uploadRoutes = new Hono();

const ALLOWED_TYPES = new Set<string>(
  ALLOWED_UPLOAD_TYPES as readonly string[],
);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

/**
 * Whether the file content starts with the signature of its declared MIME
 * type. The browser-supplied `file.type` alone can be spoofed.
 */
function matchesSignature(type: string, head: Uint8Array): boolean {
  const ascii = (start: number, text: string) =>
    [...text].every((char, i) => head[start + i] === char.charCodeAt(0));
  const bytes = (start: number, values: number[]) =>
    values.every((value, i) => head[start + i] === value);

  switch (type) {
    case "image/png":
      return bytes(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return bytes(0, [0xff, 0xd8, 0xff]);
    case "image/gif":
      return ascii(0, "GIF87a") || ascii(0, "GIF89a");
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "application/pdf":
      return ascii(0, "%PDF-");
    case "video/mp4":
    case "video/quicktime":
      return ascii(4, "ftyp") || ascii(4, "moov") || ascii(4, "mdat") || ascii(4, "wide");
    case "video/webm":
      return bytes(0, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/** Normalize a scope/feature key into a safe folder name. */
function sanitizeScope(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  created_at: string;
  in_use: boolean;
}

/** Uploaded-file URLs that are still referenced by any content table. */
async function getInUseChecker(): Promise<(url: string) => boolean> {
  const rows = await sql<{ url: string }[]>`
    SELECT url FROM (
      SELECT photo_url AS url FROM hero_profiles
      UNION SELECT logo_url FROM hero_profiles
      UNION SELECT cv_file_url FROM hero_profiles
      UNION SELECT logo_url FROM profile_skills
      UNION SELECT logo_url FROM educations
      UNION SELECT document_value FROM certificate_documents
      UNION SELECT logo_url FROM experiences
      UNION SELECT photo_url FROM experience_photos
      UNION SELECT item->>'url' FROM projects, jsonb_array_elements(media) AS item
      UNION SELECT block->>'url' FROM projects, jsonb_array_elements(content) AS block
        WHERE block ? 'url'
      UNION SELECT logo_url FROM social_links
    ) AS used
    WHERE url IS NOT NULL
  `;
  const urls = new Set(rows.map((row) => row.url));
  return (url: string) => urls.has(url);
}

uploadRoutes.get("/admin/uploads", requireAdmin, async (c) => {
  const type = c.req.query("type");
  const scope = sanitizeScope(c.req.query("scope"));
  const isInUse = await getInUseChecker();

  let objects;
  try {
    objects = await listObjects(scope ? `${scope}/` : undefined);
  } catch {
    return fail(c, "Gagal memuat daftar file dari blob store.", 502);
  }

  const list = objects
    .map((object): UploadedFile => ({
      name: object.key,
      url: object.url,
      size: object.size,
      created_at: object.lastModified,
      in_use: isInUse(object.url),
    }))
    .filter((file) => {
      const ext = path.extname(file.name).toLowerCase();
      if (type === "image" && !IMAGE_EXTENSIONS.has(ext)) return false;
      if (type === "file" && IMAGE_EXTENSIONS.has(ext)) return false;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return ok(c, list);
});

uploadRoutes.delete("/admin/uploads", requireAdmin, async (c) => {
  const name = c.req.query("name") ?? "";

  if (!isKeyValid(name)) {
    return fail(c, "Nama file tidak valid.", 400);
  }

  let url: string;
  try {
    url = await getObjectUrl(name);
  } catch {
    return fail(c, "File tidak ditemukan.", 404);
  }

  const isInUse = await getInUseChecker();
  if (isInUse(url)) {
    return fail(c, "File sedang dipakai dan tidak bisa dihapus.", 409);
  }

  try {
    await deleteObject(name);
  } catch {
    return fail(c, "Gagal menghapus file.", 500);
  }

  return ok(c, null, "File dihapus.");
});

// Reject oversized bodies while streaming, before the whole file is buffered.
const uploadBodyLimit = bodyLimit({
  maxSize: UPLOAD_LIMITS.video + 1024 * 1024,
  onError: (c) => fail(c, "File terlalu besar.", 413),
});

uploadRoutes.post("/admin/uploads", requireAdmin, uploadBodyLimit, async (c) => {
  let file: unknown;
  try {
    const body = await c.req.parseBody();
    file = body["file"];
  } catch {
    return fail(c, "Gagal membaca file yang diunggah.", 400);
  }

  if (!(file instanceof File)) {
    return fail(c, "File tidak ditemukan.", 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return fail(
      c,
      "Tipe file tidak didukung. Gunakan PNG, JPG, WEBP, GIF, PDF, MP4, WEBM, atau MOV.",
      415,
    );
  }

  const maxSize = maxUploadSize(file.type);
  if (file.size > maxSize) {
    return fail(c, uploadSizeMessage(file.type), 413);
  }

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesSignature(file.type, head)) {
    return fail(c, "Isi file tidak sesuai dengan tipenya.", 415);
  }

  const ext = EXTENSION_BY_TYPE[file.type];
  const scope = sanitizeScope(c.req.query("scope"));
  const folder = scope ? `${scope}/` : "";
  const key = `${folder}${Date.now()}-${randomUUID()}${ext}`;

  let uploaded;
  try {
    uploaded = await uploadBlob(key, file);
  } catch {
    return fail(c, "Gagal mengunggah file. Coba lagi.", 500);
  }

  return ok(c, { url: uploaded.url }, "File berhasil diunggah.");
});