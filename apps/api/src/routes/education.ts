import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sql } from "../db/client";
import type { TransactionSql } from "postgres";
import { created, fail, ok } from "../lib/response";
import { isSafeUrl } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";

export const educationRoutes = new Hono();

const SECTION_HEADER = {
  title: "",
  description: "",
  illustration_url: null as string | null,
};

interface EducationRow {
  id: number;
  logo_url: string | null;
  institution_name: string;
  degree_major: string;
  range_date: string;
  gpa: number | null;
  description: string | null;
  is_current: boolean;
}

interface CertificateRow {
  id: number;
  education_id: number;
  organization: string | null;
  title: string;
  period: string | null;
}

interface CertificateDocumentRow {
  id: number;
  certificate_id: number;
  document_value: string;
  order_index: number;
}

function toEducation(
  row: EducationRow,
  certificates: CertificateRow[],
  documents: CertificateDocumentRow[],
) {
  return {
    ...row,
    achievements: certificates
      .filter((cert) => cert.education_id === row.id)
      .map((cert) => ({
        id: cert.id,
        organization: cert.organization,
        title: cert.title,
        period: cert.period,
        documents: documents
          .filter((doc) => doc.certificate_id === cert.id)
          .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
          .map((doc) => doc.document_value),
      })),
  };
}

async function fetchDocuments(certificateIds: number[]) {
  if (certificateIds.length === 0) return [];
  return sql<CertificateDocumentRow[]>`
    SELECT id, certificate_id, document_value, order_index
    FROM certificate_documents
    WHERE certificate_id = ANY(${certificateIds})
    ORDER BY order_index, id
  `;
}

async function fetchEducation(id: number) {
  const [row] = await sql<EducationRow[]>`
    SELECT id, logo_url, institution_name, degree_major, range_date, gpa::float8 AS gpa, description, is_current
    FROM educations
    WHERE id = ${id}
  `;
  if (!row) return null;

  const certificates = await sql<CertificateRow[]>`
    SELECT id, education_id, organization, title, period
    FROM certificates
    WHERE education_id = ${id}
    ORDER BY id
  `;
  const documents = await fetchDocuments(certificates.map((cert) => cert.id));
  return toEducation(row, certificates, documents);
}

educationRoutes.get("/educations", async (c) => {
  const [rows, certificates, documents] = await Promise.all([
    sql<EducationRow[]>`
      SELECT id, logo_url, institution_name, degree_major, range_date, gpa::float8 AS gpa, description, is_current
      FROM educations
      ORDER BY id
    `,
    sql<CertificateRow[]>`
      SELECT id, education_id, organization, title, period
      FROM certificates
      ORDER BY id
    `,
    sql<CertificateDocumentRow[]>`
      SELECT id, certificate_id, document_value, order_index
      FROM certificate_documents
      ORDER BY order_index, id
    `,
  ]);

  return ok(c, {
    section_header: SECTION_HEADER,
    items: rows.map((row) => toEducation(row, certificates, documents)),
  });
});

const achievementSchema = z.object({
  organization: z.string().optional().nullable(),
  title: z.string().min(1),
  period: z.string().optional().nullable(),
  documents: z.array(z.string().refine(isSafeUrl, "URL tidak valid atau skemanya tidak diizinkan.")).optional().default([]),
});

const educationSchema = z.object({
  logo_url: z.string().optional().nullable(),
  institution_name: z.string().min(1),
  degree_major: z.string().min(1),
  range_date: z.string().min(1),
  gpa: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional().nullable(),
  is_current: z.boolean().optional().default(false),
  achievements: z.array(achievementSchema).optional().default([]),
});

function parseGpa(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

type AchievementInput = z.infer<typeof achievementSchema>;

/** Simpan satu pencapaian beserta daftar dokumennya di dalam transaksi. */
async function insertCertificate(
  tx: TransactionSql,
  educationId: number,
  achievement: AchievementInput,
) {
  const [cert] = await tx<{ id: number }[]>`
    INSERT INTO certificates (education_id, organization, title, period)
    VALUES (
      ${educationId},
      ${achievement.organization ?? null},
      ${achievement.title},
      ${achievement.period ?? null}
    )
    RETURNING id
  `;

  let order = 0;
  for (const doc of achievement.documents) {
    const value = doc.trim();
    if (!value) continue;
    await tx`
      INSERT INTO certificate_documents (certificate_id, document_value, order_index)
      VALUES (${cert.id}, ${value}, ${order})
    `;
    order += 1;
  }
}

educationRoutes.post(
  "/admin/educations",
  requireAdmin,
  zValidator("json", educationSchema),
  async (c) => {
    const body = c.req.valid("json");

    const id = await sql.begin(async (tx) => {
      const [row] = await tx<{ id: number }[]>`
        INSERT INTO educations (logo_url, institution_name, degree_major, range_date, gpa, description, is_current)
        VALUES (
          ${body.logo_url ?? null},
          ${body.institution_name},
          ${body.degree_major},
          ${body.range_date},
          ${parseGpa(body.gpa)},
          ${body.description ?? null},
          ${body.is_current}
        )
        RETURNING id
      `;

      for (const achievement of body.achievements) {
        await insertCertificate(tx, row.id, achievement);
      }

      return row.id;
    });

    return created(c, await fetchEducation(id), "Data pendidikan ditambahkan.");
  },
);

educationRoutes.put(
  "/admin/educations/:id",
  requireAdmin,
  zValidator("json", educationSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    const body = c.req.valid("json");

    const [existing] = await sql<{ id: number }[]>`SELECT id FROM educations WHERE id = ${id}`;
    if (!existing) return fail(c, "Data pendidikan tidak ditemukan.", 404);

    await sql.begin(async (tx) => {
      await tx`
        UPDATE educations SET
          logo_url = ${body.logo_url ?? null},
          institution_name = ${body.institution_name},
          degree_major = ${body.degree_major},
          range_date = ${body.range_date},
          gpa = ${parseGpa(body.gpa)},
          description = ${body.description ?? null},
          is_current = ${body.is_current},
          updated_at = now()
        WHERE id = ${id}
      `;

      await tx`DELETE FROM certificates WHERE education_id = ${id}`;
      for (const achievement of body.achievements) {
        await insertCertificate(tx, id, achievement);
      }
    });

    return ok(c, await fetchEducation(id), "Data pendidikan diperbarui.");
  },
);

educationRoutes.delete("/admin/educations/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await sql`DELETE FROM educations WHERE id = ${id}`;
  return ok(c, null, "Data pendidikan dihapus.");
});
