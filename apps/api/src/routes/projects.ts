import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import { created, fail, ok, paginated } from "../lib/response";
import { safeUrl } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";

export const projectRoutes = new Hono();

interface ProjectRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  date_range: string | null;
  media: ProjectMedia[];
  tech_stacks: string[];
  is_published: boolean;
  likes_count: number;
  shares_count: number;
  published_at: string | null;
  created_at: string;
}

interface ProjectDetailRow extends ProjectRow {
  content: ProjectBlock[];
}

type ProjectBlock = z.infer<typeof blockSchema>;
type ProjectMedia = z.infer<typeof mediaItemSchema>;

const LIST_COLUMNS = sql`
  id, slug, title, category, date_range, media,
  tech_stacks, is_published,
  likes_count, shares_count, published_at, created_at
`;

const DETAIL_COLUMNS = sql`
  ${LIST_COLUMNS}, content
`;

// Detail publik juga mengembalikan draft — homepage menampilkan semua project
// (termasuk draft), jadi kartunya harus tetap bisa dibuka.
async function fetchProjectBySlug(slug: string): Promise<ProjectDetailRow | null> {
  const [row] = await sql<ProjectDetailRow[]>`
    SELECT ${DETAIL_COLUMNS} FROM projects
    WHERE slug = ${slug}
  `;
  return row ?? null;
}

async function fetchProjectById(id: number): Promise<ProjectDetailRow | null> {
  const [row] = await sql<ProjectDetailRow[]>`
    SELECT ${DETAIL_COLUMNS} FROM projects WHERE id = ${id}
  `;
  return row ?? null;
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "project";
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let counter = 1;
  for (;;) {
    const [row] = await sql<{ id: number }[]>`SELECT id FROM projects WHERE slug = ${slug}`;
    if (!row) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
}

// 6.1 Daftar Proyek & Postingan (Public)
projectRoutes.get("/projects", async (c) => {
  const search = (c.req.query("search") ?? "").trim();
  const category = (c.req.query("category") ?? "").trim();
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 6) || 6));
  const offset = (page - 1) * limit;
  const like = `%${search}%`;

  const [rows, countRows] = await Promise.all([
    sql<ProjectRow[]>`
      SELECT ${LIST_COLUMNS} FROM projects
      WHERE is_published = TRUE
        AND (${search} = '' OR title ILIKE ${like})
        AND (${category} = '' OR category = ${category})
      ORDER BY created_at DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM projects
      WHERE is_published = TRUE
        AND (${search} = '' OR title ILIKE ${like})
        AND (${category} = '' OR category = ${category})
    `,
  ]);

  const total = countRows[0]?.count ?? 0;

  return paginated(c, rows, {
    current_page: page,
    last_page: Math.max(1, Math.ceil(total / limit)),
    per_page: limit,
    total,
    search_enabled: true,
  });
});

/** Panjang maksimum ringkasan isi di kartu proyek. */
const EXCERPT_LENGTH = 140;

/**
 * Ringkasan singkat isi proyek untuk kartu: teks polos dari blok Teks pertama
 * (atau Heading non-judul bila tidak ada), dipotong ke EXCERPT_LENGTH karakter.
 */
function buildExcerpt(content: ProjectBlock[]): string | null {
  const block =
    content.find((b) => b.type === "text") ??
    content.find((b) => b.type === "heading" && !("isTitle" in b && b.isTitle));
  const html = block && "text" in block ? String(block.text ?? "") : "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
}

// 6.1b Daftar semua proyek yang sudah terbit (tanpa draft) — dipakai halaman
// /projects di web public. Diurutkan dari yang paling baru. Tiap item
// menyertakan `excerpt` (ringkasan isi) untuk kartu.
projectRoutes.get("/home/projects", async (c) => {
  const rows = await sql<ProjectDetailRow[]>`
    SELECT ${DETAIL_COLUMNS} FROM projects
    WHERE is_published = TRUE
    ORDER BY created_at DESC, id DESC
  `;
  return ok(
    c,
    rows.map(({ content, ...row }) => ({ ...row, excerpt: buildExcerpt(content ?? []) })),
  );
});

// 6.2 Detail Proyek / Postingan (Public)
projectRoutes.get("/projects/:slug", async (c) => {
  const project = await fetchProjectBySlug(c.req.param("slug"));
  if (!project) return fail(c, "Proyek tidak ditemukan.", 404);
  return ok(c, project);
});

// Admin: daftar semua proyek (termasuk draft).
projectRoutes.get("/admin/projects", requireAdmin, async (c) => {
  const rows = await sql<ProjectRow[]>`
    SELECT ${LIST_COLUMNS} FROM projects
    ORDER BY created_at DESC, id DESC
  `;
  return ok(c, rows);
});

// Admin: detail proyek berdasarkan id (termasuk draft).
projectRoutes.get("/admin/projects/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const project = await fetchProjectById(id);
  if (!project) return fail(c, "Proyek tidak ditemukan.", 404);
  return ok(c, project);
});

const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: safeUrl(),
});

const alignSchema = z.enum(["left", "center", "right"]).optional().nullable();
const fitSchema = z.enum(["fill", "fit"]).optional().nullable();

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    text: z.string().min(1),
    align: alignSchema,
    isTitle: z.boolean().optional().nullable(),
  }),
  z.object({
    type: z.literal("image"),
    url: safeUrl(),
    caption: z.string().max(255).optional().nullable(),
    align: alignSchema,
    fit: fitSchema,
  }),
  z.object({
    type: z.literal("video"),
    url: safeUrl(),
    caption: z.string().max(255).optional().nullable(),
    align: alignSchema,
    fit: fitSchema,
  }),
  z.object({
    type: z.literal("link"),
    url: safeUrl(),
    label: z.string().max(255).optional().nullable(),
    align: alignSchema,
  }),
  z.object({
    type: z.literal("text"),
    text: z.string().min(1),
    align: alignSchema,
  }),
  z.object({
    type: z.literal("gallery"),
    images: z
      .array(
        z.object({
          url: safeUrl(),
          caption: z.string().max(255).optional().nullable(),
        }),
      )
      .min(1),
  }),
]);

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  date_range: z.string().max(100).optional().nullable(),
  media: z.array(mediaItemSchema).optional().default([]),
  tech_stacks: z.array(z.string()).optional().default([]),
  is_published: z.boolean().optional().default(true),
  content: z.array(blockSchema).optional().default([]),
});

// 6.3 Tambah Proyek (Admin)
projectRoutes.post(
  "/admin/projects",
  requireAdmin,
  zValidator("json", projectSchema),
  async (c) => {
    const body = c.req.valid("json");
    const slug = await uniqueSlug(body.title);

    const [row] = await sql<{ id: number }[]>`
      INSERT INTO projects
        (title, slug, category, date_range, content, media,
         tech_stacks, is_published, published_at)
      VALUES (
        ${body.title},
        ${slug},
        ${body.category},
        ${body.date_range ?? null},
        ${sql.json(body.content)},
        ${sql.json(body.media)},
        ${sql.json(body.tech_stacks)},
        ${body.is_published},
        ${body.is_published ? sql`now()` : null}
      )
      RETURNING id
    `;

    return created(c, await fetchProjectById(row.id), "Proyek berhasil ditambahkan.");
  },
);

// 6.3 Edit Proyek (Admin)
projectRoutes.put(
  "/admin/projects/:id",
  requireAdmin,
  zValidator("json", projectSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");

    const [existing] = await sql<{ id: number }[]>`
      SELECT id FROM projects WHERE id = ${id}
    `;
    if (!existing) return fail(c, "Proyek tidak ditemukan.", 404);

    await sql`
      UPDATE projects SET
        title = ${body.title},
        category = ${body.category},
        date_range = ${body.date_range ?? null},
        content = ${sql.json(body.content)},
        media = ${sql.json(body.media)},
        tech_stacks = ${sql.json(body.tech_stacks)},
        is_published = ${body.is_published},
        published_at = ${body.is_published ? sql`COALESCE(published_at, now())` : null},
        updated_at = now()
      WHERE id = ${id}
    `;

    return ok(c, await fetchProjectById(id), "Proyek berhasil diperbarui.");
  },
);

// 6.4 Hapus Proyek (Admin)
projectRoutes.delete("/admin/projects/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await sql`DELETE FROM projects WHERE id = ${id}`;
  return ok(c, null, "Proyek berhasil dihapus.");
});
