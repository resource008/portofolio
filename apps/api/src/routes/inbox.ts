import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { sql } from "../db/client";
import { rateLimit } from "../lib/rate-limit";
import { created, fail, ok } from "../lib/response";
import { zValidate } from "../lib/validate";
import { requireAdmin } from "../middleware/auth";

export const inboxRoutes = new Hono();

/** Panjang cuplikan pesan singkat yang ditampilkan di daftar inbox. */
const LIST_EXCERPT_LENGTH = 120;

/**
 * Membuat cuplikan pesan singkat untuk daftar inbox.
 * Teks utuh tetap tersedia lewat endpoint detail (`GET /admin/inbox/:id`).
 */
function excerpt(message: string, max = LIST_EXCERPT_LENGTH): string {
  const compact = message.trim().replace(/\s+/g, " ");
  if (compact.length <= max) return compact;
  const slice = compact.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : slice}…`;
}

interface InboxRow {
  id: number;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama minimal 3 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid.")
    .max(150, "Email maksimal 150 karakter."),
  message: z
    .string()
    .trim()
    .min(10, "Pesan minimal 10 karakter.")
    .max(3000, "Pesan maksimal 3000 karakter."),
});

const contactLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: 5,
  message: "Terlalu banyak pesan terkirim. Coba lagi dalam satu jam.",
});

inboxRoutes.post("/contact", contactLimit, zValidate(contactSchema), async (c) => {
  const body = c.req.valid("json");

  const [row] = await sql<{ id: number; created_at: string }[]>`
    INSERT INTO contact_inboxes (name, email, message)
    VALUES (${body.name}, ${body.email}, ${body.message})
    RETURNING id, created_at
  `;

  const [admin] = await sql<{ id: string }[]>`
    SELECT id FROM "user" ORDER BY "createdAt" LIMIT 1
  `;

  await sql`
    INSERT INTO notifications (type, title, body, notifiable_type, notifiable_id, data)
    VALUES (
      'contact_message',
      ${`Pesan dari ${body.name}`},
      ${body.message.slice(0, 180)},
      'user',
      ${admin?.id ?? ""},
      ${sql.json({ inbox_id: row.id, url: `/admin/inbox/${row.id}` })}
    )
  `;

  return created(
    c,
    { id: row.id, name: body.name, created_at: row.created_at },
    "Pesan Anda berhasil terkirim. Terima kasih telah menghubungi saya!",
  );
});

inboxRoutes.get("/admin/inbox", requireAdmin, async (c) => {
  const rows = await sql<InboxRow[]>`
    SELECT id, name, email, message, is_read, read_at, created_at
    FROM contact_inboxes
    ORDER BY created_at DESC
    LIMIT 200
  `;
  // Daftar hanya mengirim cuplikan pesan singkat agar ringan;
  // isi pesan utuh diambil lewat endpoint detail saat dibuka.
  return ok(c, rows.map((row) => ({ ...row, message: excerpt(row.message) })));
});

async function getInboxUnreadCount(): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM contact_inboxes WHERE is_read = FALSE
  `;
  return row?.count ?? 0;
}

inboxRoutes.get("/admin/inbox/unread-count", requireAdmin, async (c) => {
  return ok(c, { count: await getInboxUnreadCount() });
});

// Realtime unread count for the sidebar badge via Server-Sent Events.
inboxRoutes.get("/admin/inbox/stream", requireAdmin, async (c) => {
  return streamSSE(c, async (stream) => {
    let last: number | null = null;
    while (!stream.aborted && !stream.closed) {
      const count = await getInboxUnreadCount();
      if (count !== last) {
        last = count;
        await stream.writeSSE({ event: "inbox", data: JSON.stringify({ count }) });
      }
      await stream.sleep(5000);
    }
  });
});

inboxRoutes.get("/admin/inbox/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));

  const [row] = await sql<InboxRow[]>`
    UPDATE contact_inboxes
    SET is_read = TRUE, read_at = COALESCE(read_at, now())
    WHERE id = ${id}
    RETURNING id, name, email, message, is_read, read_at, created_at
  `;

  if (!row) return fail(c, "Pesan tidak ditemukan.", 404);

  return ok(c, {
    ...row,
    email_link: `mailto:${row.email}?subject=Re:%20Pesan%20dari%20Portofolio`,
  });
});

inboxRoutes.delete("/admin/inbox/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  await sql`DELETE FROM contact_inboxes WHERE id = ${id}`;
  return ok(c, null, "Pesan berhasil dihapus.");
});
