import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { clientIp, rateLimit } from "../lib/rate-limit";
import { ok } from "../lib/response";

export const analyticsRoutes = new Hono();

const trackSchema = z.object({
  event_type: z.enum(["like", "unlike", "share", "reading_time"]),
  target_type: z.enum(["portfolio", "project", "post"]),
  target_id: z.number().int().nullable().optional(),
  duration_seconds: z.number().int().min(0).optional().default(0),
});

const trackLimit = rateLimit({ windowMs: 60_000, max: 30 });

analyticsRoutes.post("/analytics/track", trackLimit, zValidator("json", trackSchema), async (c) => {
  const body = c.req.valid("json");
  const dayOfWeek = new Date().getDay(); // 0 = Minggu … 6 = Sabtu
  const ip = clientIp(c);

  // Unlike membatalkan like: hapus satu log like dari IP yang sama dan kurangi
  // jumlahnya — tidak dicatat sebagai event tersendiri. Like dari IP lain tidak
  // bisa dibatalkan.
  if (body.event_type === "unlike") {
    if (body.target_type === "project" && body.target_id && ip) {
      const deleted = await sql`
        DELETE FROM analytics_logs WHERE id = (
          SELECT id FROM analytics_logs
          WHERE event_type = 'like' AND target_type = 'project' AND target_id = ${body.target_id}
            AND ip_address = ${ip}
          ORDER BY created_at DESC
          LIMIT 1
        )
      `;
      if (deleted.count > 0) {
        await sql`UPDATE projects SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ${body.target_id}`;
      }
    }
    return ok(c, null, "Like dibatalkan.");
  }

  await sql`
    INSERT INTO analytics_logs (event_type, target_type, target_id, day_of_week, duration_seconds, ip_address)
    VALUES (${body.event_type}, ${body.target_type}, ${body.target_id ?? null}, ${dayOfWeek}, ${body.duration_seconds}, ${ip})
  `;

  if (body.target_type === "project" && body.target_id) {
    if (body.event_type === "like") {
      await sql`UPDATE projects SET likes_count = likes_count + 1 WHERE id = ${body.target_id}`;
    } else if (body.event_type === "share") {
      await sql`UPDATE projects SET shares_count = shares_count + 1 WHERE id = ${body.target_id}`;
    }
  }

  return ok(c, null, "Metrik berhasil dicatat.");
});
