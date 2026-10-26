import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { created, fail, ok } from "../lib/response";
import { requireAdmin } from "../middleware/auth";

export const announcementRoutes = new Hono();

interface AnnouncementRow {
  id: number;
  kind: "general" | "project";
  type: "info" | "update" | "new_post";
  text: string | null;
  is_active: boolean;
  order_index: number;
  post_mode: "auto" | "manual";
  project_ids: number[];
}

interface ProjectRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  date_range: string | null;
  media: { type: "image" | "video"; url: string }[];
  tech_stacks: string[];
  is_published: boolean;
  likes_count: number;
  shares_count: number;
  created_at: string;
}

const PROJECT_COLUMNS = sql`
  id, slug, title, category, date_range, media,
  tech_stacks, is_published,
  likes_count, shares_count, created_at
`;

function toAnnouncement(row: AnnouncementRow) {
  return {
    id: row.id,
    kind: row.kind,
    type: row.type,
    text: row.text,
    is_active: row.is_active,
    order_index: row.order_index,
    post_mode: row.post_mode,
    project_ids: row.project_ids ?? [],
  };
}

async function resolveProjects(row: AnnouncementRow): Promise<ProjectRow[]> {
  if (row.kind !== "project") return [];

  if (row.post_mode === "manual") {
    const ids = row.project_ids ?? [];
    if (ids.length === 0) return [];
    const rows = await sql<ProjectRow[]>`
      SELECT ${PROJECT_COLUMNS} FROM projects
      WHERE is_published = TRUE AND id IN ${sql(ids)}
    `;
    const byId = new Map(rows.map((project) => [project.id, project]));
    return ids.map((id) => byId.get(id)).filter((project): project is ProjectRow => Boolean(project));
  }

  return sql<ProjectRow[]>`
    SELECT ${PROJECT_COLUMNS} FROM projects
    WHERE is_published = TRUE
    ORDER BY created_at DESC, id DESC
  `;
}

announcementRoutes.get("/project-announcements", async (c) => {
  const rows = await sql<AnnouncementRow[]>`
    SELECT id, kind, type, text, is_active, order_index, post_mode, project_ids
    FROM project_announcements
    WHERE is_active = TRUE
    ORDER BY order_index, id
  `;

  const announcements = await Promise.all(
    rows.map(async (row) => ({
      ...toAnnouncement(row),
      projects: await resolveProjects(row),
    })),
  );

  return ok(c, { announcements });
});

announcementRoutes.get("/admin/project-announcements", requireAdmin, async (c) => {
  const rows = await sql<AnnouncementRow[]>`
    SELECT id, kind, type, text, is_active, order_index, post_mode, project_ids
    FROM project_announcements
    ORDER BY order_index, id
  `;
  return ok(c, { announcements: rows.map(toAnnouncement) });
});

const announcementSchema = z.object({
  kind: z.enum(["general", "project"]).optional().default("general"),
  type: z.enum(["info", "update", "new_post"]).optional().default("info"),
  text: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  post_mode: z.enum(["auto", "manual"]).optional().default("auto"),
  project_ids: z.array(z.number().int().positive()).optional().default([]),
});

async function fetchAnnouncement(id: number): Promise<AnnouncementRow | null> {
  const [row] = await sql<AnnouncementRow[]>`
    SELECT id, kind, type, text, is_active, order_index, post_mode, project_ids
    FROM project_announcements WHERE id = ${id}
  `;
  return row ?? null;
}

announcementRoutes.post(
  "/admin/project-announcements",
  requireAdmin,
  zValidator("json", announcementSchema),
  async (c) => {
    const body = c.req.valid("json");
    const [orderRow] = await sql<{ max: number | null }[]>`
      SELECT MAX(order_index) AS max FROM project_announcements
    `;
    const orderIndex = (orderRow?.max ?? -1) + 1;

    const [row] = await sql<{ id: number }[]>`
      INSERT INTO project_announcements
        (kind, type, text, is_active, order_index, post_mode, project_ids)
      VALUES (
        ${body.kind},
        ${body.type},
        ${body.text ?? null},
        ${body.is_active},
        ${orderIndex},
        ${body.post_mode},
        ${sql.json(body.project_ids)}
      )
      RETURNING id
    `;

    return created(c, toAnnouncement((await fetchAnnouncement(row.id))!), "Announcement ditambahkan.");
  },
);

announcementRoutes.put(
  "/admin/project-announcements/reorder",
  requireAdmin,
  zValidator("json", z.object({ ids: z.array(z.number().int().positive()) })),
  async (c) => {
    const { ids } = c.req.valid("json");
    await sql.begin(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx`UPDATE project_announcements SET order_index = ${index} WHERE id = ${id}`;
      }
    });
    return ok(c, null, "Urutan announcement disimpan.");
  },
);

announcementRoutes.put(
  "/admin/project-announcements/:id",
  requireAdmin,
  zValidator("json", announcementSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");

    const [existing] = await sql<{ id: number }[]>`
      SELECT id FROM project_announcements WHERE id = ${id}
    `;
    if (!existing) return fail(c, "Announcement tidak ditemukan.", 404);

    await sql`
      UPDATE project_announcements SET
        kind = ${body.kind},
        type = ${body.type},
        text = ${body.text ?? null},
        is_active = ${body.is_active},
        post_mode = ${body.post_mode},
        project_ids = ${sql.json(body.project_ids)},
        updated_at = now()
      WHERE id = ${id}
    `;

    return ok(c, toAnnouncement((await fetchAnnouncement(id))!), "Announcement diperbarui.");
  },
);

announcementRoutes.delete("/admin/project-announcements/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await sql`DELETE FROM project_announcements WHERE id = ${id}`;
  return ok(c, null, "Announcement dihapus.");
});
