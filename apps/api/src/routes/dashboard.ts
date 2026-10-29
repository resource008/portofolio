import path from "node:path";
import { Hono } from "hono";
import { sql } from "../db/client";
import { requireAdmin } from "../middleware/auth";
import { ok } from "../lib/response";
import { isStorageConfigured, listObjects } from "../lib/storage";

export const dashboardRoutes = new Hono();

// Default mengikuti limit plan Vercel Blob (10 GB); ubah via env STORAGE_LIMIT_MB.
const STORAGE_LIMIT_MB = Number(process.env.STORAGE_LIMIT_MB || 10240);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

interface StorageTypeStats {
  count: number;
  size_mb: number;
}

interface StorageBreakdown {
  images: StorageTypeStats;
  videos: StorageTypeStats;
  documents: StorageTypeStats;
  storage_used_mb: number;
  storage_limit_mb: number;
}

async function getStorageBreakdown(): Promise<StorageBreakdown> {
  const empty = (): StorageTypeStats => ({ count: 0, size_mb: 0 });
  const breakdown: StorageBreakdown = {
    images: empty(),
    videos: empty(),
    documents: empty(),
    storage_used_mb: 0,
    storage_limit_mb: STORAGE_LIMIT_MB,
  };

  if (!isStorageConfigured()) return breakdown;

  try {
    const objects = await listObjects();
    let totalBytes = 0;

    for (const object of objects) {
      totalBytes += object.size;
      const ext = path.extname(object.key).toLowerCase();

      if (IMAGE_EXTENSIONS.has(ext)) {
        breakdown.images.count += 1;
        breakdown.images.size_mb += object.size / (1024 * 1024);
      } else if (VIDEO_EXTENSIONS.has(ext)) {
        breakdown.videos.count += 1;
        breakdown.videos.size_mb += object.size / (1024 * 1024);
      } else {
        breakdown.documents.count += 1;
        breakdown.documents.size_mb += object.size / (1024 * 1024);
      }
    }

    breakdown.images.size_mb = Math.round(breakdown.images.size_mb * 100) / 100;
    breakdown.videos.size_mb = Math.round(breakdown.videos.size_mb * 100) / 100;
    breakdown.documents.size_mb = Math.round(breakdown.documents.size_mb * 100) / 100;
    breakdown.storage_used_mb = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
  } catch {
  }

  return breakdown;
}

dashboardRoutes.get("/admin/dashboard/stats", requireAdmin, async (c) => {
  const [likes] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM analytics_logs WHERE event_type = 'like'
  `;
  const [projects] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM projects
  `;
  const [unread] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM contact_inboxes WHERE is_read = FALSE
  `;
  const [projectPhotos] = await sql<{ count: number }[]>`
    SELECT (
      COALESCE(SUM(
        (SELECT COUNT(*) FROM jsonb_array_elements(media) AS item WHERE item->>'type' = 'image')
      ), 0) +
      COALESCE(SUM(
        (SELECT COUNT(*) FROM jsonb_array_elements(content) AS block WHERE block->>'type' = 'image')
      ), 0)
    )::int AS count
    FROM projects
  `;
  const [experiencePhotos] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM experience_photos
  `;

  const storage = await getStorageBreakdown();

  return ok(c, {
    summary: {
      total_likes: likes?.count ?? 0,
      total_projects: projects?.count ?? 0,
      total_photos: (projectPhotos?.count ?? 0) + (experiencePhotos?.count ?? 0),
      total_unread_messages: unread?.count ?? 0,
    },
    storage_details: {
      images: storage.images,
      videos: storage.videos,
      documents: storage.documents,
    },
    media_overview: {
      project_photos_count: projectPhotos?.count ?? 0,
      experience_photos_count: experiencePhotos?.count ?? 0,
      storage_used_mb: storage.storage_used_mb,
      storage_limit_mb: storage.storage_limit_mb,
    },
  });
});