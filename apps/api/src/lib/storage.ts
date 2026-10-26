import { del, head, list, put } from "@vercel/blob";
import { env } from "../env";

export function isStorageConfigured(): boolean {
  return Boolean(env.blobReadWriteToken);
}

export function isKeyValid(key: string): boolean {
  if (!key || key.includes("..")) return false;
  const segments = key.split("/");
  if (segments.length > 2) return false;
  return segments.every((segment) => /^[A-Za-z0-9._-]+$/.test(segment));
}

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  lastModified: string;
}

/** The returned URL is stable and can be persisted in the database. */
export async function uploadBlob(
  key: string,
  file: File,
): Promise<{ key: string; url: string; size: number }> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Vercel Blob belum dikonfigurasi. Isi BLOB_READ_WRITE_TOKEN di apps/api/.env.",
    );
  }

  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
    multipart: true,
  });

  return { key: blob.pathname, url: blob.url, size: file.size };
}

export async function getObjectUrl(key: string): Promise<string> {
  const info = await head(key);
  return info.url;
}

export async function listObjects(prefix?: string): Promise<StoredObject[]> {
  const objects: StoredObject[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix,
      limit: 1000,
      cursor,
    });

    for (const item of page.blobs) {
      objects.push({
        key: item.pathname,
        url: item.url,
        size: item.size ?? 0,
        lastModified: (item.uploadedAt ?? new Date()).toISOString(),
      });
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return objects;
}

export async function getStorageUsedBytes(): Promise<number> {
  const objects = await listObjects();
  return objects.reduce((sum, item) => sum + item.size, 0);
}

export async function deleteObject(key: string): Promise<void> {
  await del(key);
}