import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { resolveTechLogo } from "../lib/logo";
import { ok } from "../lib/response";
import { requireAdmin } from "../middleware/auth";

export const profileRoutes = new Hono();

interface HeroRow {
  id: number;
  heading: string | null;
  subheading: string;
  description: string | null;
  logo_url: string | null;
  photo_url: string | null;
  cv_file_url: string | null;
}

interface SkillRow {
  id: number;
  name: string;
  logo_url: string | null;
  is_highlight: boolean;
  order_index: number;
}

async function getProfile() {
  const [profile] = await sql<HeroRow[]>`SELECT * FROM hero_profiles ORDER BY id LIMIT 1`;
  if (!profile) return null;

  const skills = await sql<SkillRow[]>`
    SELECT id, name, logo_url, is_highlight, order_index
    FROM profile_skills
    WHERE hero_profile_id = ${profile.id}
    ORDER BY order_index
  `;

  const map = (rows: SkillRow[]) =>
    rows.map((row) => ({ id: row.id, name: row.name, logo_url: row.logo_url }));

  return {
    ...profile,
    highlight_skills: map(skills.filter((skill) => skill.is_highlight)),
    tech_stacks: map(skills.filter((skill) => !skill.is_highlight)),
  };
}

profileRoutes.get("/profile", async (c) => ok(c, await getProfile()));

const skillSchema = z.object({
  name: z.string().min(1),
  logo_url: z.string().optional().nullable(),
});

const profileSchema = z.object({
  heading: z.string().optional().nullable(),
  subheading: z.string().min(1),
  description: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  cv_file_url: z.string().optional().nullable(),
  highlight_skills: z.array(skillSchema).max(5).optional().default([]),
  tech_stacks: z.array(skillSchema).optional().default([]),
});

profileRoutes.put(
  "/admin/profile",
  requireAdmin,
  zValidator("json", profileSchema),
  async (c) => {
    const body = c.req.valid("json");
    const [existing] = await sql<{ id: number }[]>`SELECT id FROM hero_profiles ORDER BY id LIMIT 1`;

    const logoFor = (skill: { name: string; logo_url?: string | null }) =>
      skill.logo_url && skill.logo_url.length > 0 ? skill.logo_url : resolveTechLogo(skill.name);

    await sql.begin(async (tx) => {
      let profileId: number;

      if (existing) {
        profileId = existing.id;
        await tx`
          UPDATE hero_profiles SET
            heading = ${body.heading ?? null},
            subheading = ${body.subheading},
            description = ${body.description ?? null},
            logo_url = ${body.logo_url ?? null},
            photo_url = ${body.photo_url ?? null},
            cv_file_url = ${body.cv_file_url ?? null},
            updated_at = now()
          WHERE id = ${profileId}
        `;
        await tx`DELETE FROM profile_skills WHERE hero_profile_id = ${profileId}`;
      } else {
        const [row] = await tx<{ id: number }[]>`
          INSERT INTO hero_profiles (heading, subheading, description, logo_url, photo_url, cv_file_url)
          VALUES (${body.heading ?? null}, ${body.subheading}, ${body.description ?? null}, ${body.logo_url ?? null}, ${body.photo_url ?? null}, ${body.cv_file_url ?? null})
          RETURNING id
        `;
        profileId = row.id;
      }

      let order = 0;
      for (const skill of body.highlight_skills) {
        await tx`
          INSERT INTO profile_skills (hero_profile_id, name, logo_url, is_highlight, order_index)
          VALUES (${profileId}, ${skill.name}, NULL, TRUE, ${order++})
        `;
      }
      for (const skill of body.tech_stacks) {
        await tx`
          INSERT INTO profile_skills (hero_profile_id, name, logo_url, is_highlight, order_index)
          VALUES (${profileId}, ${skill.name}, ${logoFor(skill)}, FALSE, ${order++})
        `;
      }
    });

    return ok(c, await getProfile(), "Profil tersimpan.");
  },
);
