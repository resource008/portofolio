import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { resolveLogoFromUrl, resolveSocialName } from "../lib/logo";
import { created, fail, ok } from "../lib/response";
import { safeUrl } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";

export const socialLinkRoutes = new Hono();

interface SocialRow {
  id: number;
  platform: string;
  url: string;
  logo_url: string;
  order_index: number;
}

socialLinkRoutes.get("/social-links", async (c) => {
  const rows = await sql<SocialRow[]>`
    SELECT id, platform, url, logo_url, order_index
    FROM social_links
    ORDER BY order_index, id
  `;
  return ok(
    c,
    rows.map((row) => ({
      ...row,
      platform: resolveSocialName(row.url) || row.platform,
      logo_url: resolveLogoFromUrl(row.url) ?? row.logo_url,
    })),
  );
});

const linkSchema = z.object({
  url: safeUrl(),
});

function logoFor(url: string): string | null {
  return resolveLogoFromUrl(url);
}

socialLinkRoutes.post(
  "/admin/social-links",
  requireAdmin,
  zValidator("json", linkSchema),
  async (c) => {
    const body = c.req.valid("json");
    const [max] = await sql<{ max: number | null }[]>`SELECT MAX(order_index) AS max FROM social_links`;
    const order = (max?.max ?? -1) + 1;

    const [row] = await sql<SocialRow[]>`
      INSERT INTO social_links (platform, url, logo_url, order_index)
      VALUES (${resolveSocialName(body.url)}, ${body.url}, ${logoFor(body.url)}, ${order})
      RETURNING id, platform, url, logo_url, order_index
    `;
    return created(c, row, "Tautan media ditambahkan.");
  },
);

const reorderSchema = z.object({ ids: z.array(z.number().int().positive()).min(1) });

// Registered before `/:id` so the literal path wins.
socialLinkRoutes.patch(
  "/admin/social-links/reorder",
  requireAdmin,
  zValidator("json", reorderSchema),
  async (c) => {
    const { ids } = c.req.valid("json");
    await sql.begin(async (tx) => {
      for (let index = 0; index < ids.length; index++) {
        await tx`UPDATE social_links SET order_index = ${index} WHERE id = ${ids[index]}`;
      }
    });
    return ok(c, null, "Urutan tautan media diperbarui.");
  },
);

socialLinkRoutes.put(
  "/admin/social-links/:id",
  requireAdmin,
  zValidator("json", linkSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");

    const [row] = await sql<SocialRow[]>`
      UPDATE social_links SET
        platform = ${resolveSocialName(body.url)},
        url = ${body.url},
        logo_url = ${logoFor(body.url)},
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, platform, url, logo_url, order_index
    `;

    if (!row) return fail(c, "Tautan tidak ditemukan.", 404);
    return ok(c, row, "Tautan media diperbarui.");
  },
);

socialLinkRoutes.delete("/admin/social-links/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await sql`DELETE FROM social_links WHERE id = ${id}`;
  return ok(c, null, "Tautan media dihapus.");
});
