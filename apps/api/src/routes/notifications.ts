import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { ok } from "../lib/response";
import { requireAdmin } from "../middleware/auth";

export const notificationRoutes = new Hono();

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

notificationRoutes.get("/admin/notifications", requireAdmin, async (c) => {
  const admin = c.get("admin");
  const status = c.req.query("status") ?? "all";

  const rows = await sql<NotificationRow[]>`
    SELECT id, title, body, (read_at IS NOT NULL) AS is_read, created_at
    FROM notifications
    WHERE notifiable_type = 'user'
      AND (notifiable_id = ${admin.id} OR notifiable_id = '')
      ${status === "unread" ? sql`AND read_at IS NULL` : sql``}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return ok(c, rows);
});

notificationRoutes.post("/admin/notifications/:id/read", requireAdmin, async (c) => {
  const id = c.req.param("id");
  await sql`UPDATE notifications SET read_at = now() WHERE id = ${id} AND read_at IS NULL`;
  return ok(c, null, "Notifikasi ditandai dibaca.");
});

notificationRoutes.post("/admin/notifications/read-all", requireAdmin, async (c) => {
  const admin = c.get("admin");
  await sql`
    UPDATE notifications SET read_at = now()
    WHERE notifiable_type = 'user'
      AND (notifiable_id = ${admin.id} OR notifiable_id = '')
      AND read_at IS NULL
  `;
  return ok(c, null, "Semua notifikasi ditandai dibaca.");
});

notificationRoutes.delete("/admin/notifications/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  await sql`DELETE FROM notifications WHERE id = ${id}`;
  return ok(c, null, "Notifikasi dihapus.");
});

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1) });

notificationRoutes.post(
  "/admin/notifications/delete",
  requireAdmin,
  zValidator("json", bulkDeleteSchema),
  async (c) => {
    const { ids } = c.req.valid("json");
    await sql`DELETE FROM notifications WHERE id IN ${sql(ids)}`;
    return ok(c, null, "Notifikasi dihapus.");
  },
);
