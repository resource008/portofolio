import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { created, fail, ok } from "../lib/response";
import { requireAdmin } from "../middleware/auth";

export const experienceRoutes = new Hono();

const SECTION_HEADER = {
  title: "",
  description: "",
  logo_svg: null as string | null,
};

interface ExperienceRow {
  id: number;
  company_name: string;
  position: string;
  range_date: string;
  logo_url: string | null;
  description: string | null;
  skills: string[];
  is_current: boolean;
}

interface ExperiencePhotoRow {
  id: number;
  experience_id: number;
  photo_url: string;
  caption: string | null;
}

function toExperience(row: ExperienceRow, photos: ExperiencePhotoRow[]) {
  return {
    ...row,
    photos: photos.filter((photo) => photo.experience_id === row.id).map((photo) => photo.photo_url),
  };
}

async function fetchExperience(id: number) {
  const [row] = await sql<ExperienceRow[]>`
    SELECT id, company_name, position, range_date, logo_url, description,
           skills, is_current
    FROM experiences
    WHERE id = ${id}
  `;
  if (!row) return null;

  const photos = await sql<ExperiencePhotoRow[]>`
    SELECT id, experience_id, photo_url, caption
    FROM experience_photos
    WHERE experience_id = ${id}
    ORDER BY id
  `;
  return toExperience(row, photos);
}

experienceRoutes.get("/experiences", async (c) => {
  const [rows, photos] = await Promise.all([
    sql<ExperienceRow[]>`
      SELECT id, company_name, position, range_date, logo_url, description,
             skills, is_current
      FROM experiences
      ORDER BY id
    `,
    sql<ExperiencePhotoRow[]>`
      SELECT id, experience_id, photo_url, caption
      FROM experience_photos
      ORDER BY id
    `,
  ]);

  return ok(c, {
    section_header: SECTION_HEADER,
    items: rows.map((row) => toExperience(row, photos)),
  });
});

experienceRoutes.get("/admin/experiences/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const item = await fetchExperience(id);
  if (!item) return fail(c, "Data pengalaman tidak ditemukan.", 404);
  return ok(c, item);
});

const experienceSchema = z.object({
  company_name: z.string().min(1),
  position: z.string().min(1),
  range_date: z.string().min(1),
  logo_url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  photos: z.array(z.string()).optional().default([]),
  is_current: z.boolean().optional().default(false),
});

experienceRoutes.post(
  "/admin/experiences",
  requireAdmin,
  zValidator("json", experienceSchema),
  async (c) => {
    const body = c.req.valid("json");

    const id = await sql.begin(async (tx) => {
      const [row] = await tx<{ id: number }[]>`
        INSERT INTO experiences
          (company_name, position, range_date, logo_url, description, skills, is_current)
        VALUES (
          ${body.company_name},
          ${body.position},
          ${body.range_date},
          ${body.logo_url ?? null},
          ${body.description ?? null},
          ${sql.json(body.skills)},
          ${body.is_current}
        )
        RETURNING id
      `;

      for (const photo of body.photos) {
        await tx`
          INSERT INTO experience_photos (experience_id, photo_url)
          VALUES (${row.id}, ${photo})
        `;
      }

      return row.id;
    });

    return created(c, await fetchExperience(id), "Data pengalaman ditambahkan.");
  },
);

experienceRoutes.put(
  "/admin/experiences/:id",
  requireAdmin,
  zValidator("json", experienceSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");

    const [existing] = await sql<{ id: number }[]>`SELECT id FROM experiences WHERE id = ${id}`;
    if (!existing) return fail(c, "Data pengalaman tidak ditemukan.", 404);

    await sql.begin(async (tx) => {
      await tx`
        UPDATE experiences SET
          company_name = ${body.company_name},
          position = ${body.position},
          range_date = ${body.range_date},
          logo_url = ${body.logo_url ?? null},
          description = ${body.description ?? null},
          skills = ${sql.json(body.skills)},
          is_current = ${body.is_current},
          updated_at = now()
        WHERE id = ${id}
      `;

      await tx`DELETE FROM experience_photos WHERE experience_id = ${id}`;
      for (const photo of body.photos) {
        await tx`
          INSERT INTO experience_photos (experience_id, photo_url)
          VALUES (${id}, ${photo})
        `;
      }
    });

    return ok(c, await fetchExperience(id), "Data pengalaman diperbarui.");
  },
);

experienceRoutes.delete("/admin/experiences/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await sql`DELETE FROM experiences WHERE id = ${id}`;
  return ok(c, null, "Data pengalaman dihapus.");
});
