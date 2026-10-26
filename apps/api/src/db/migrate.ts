import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "./client";

export async function runMigrations(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      run_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Resolve from cwd (apps/api) so it works both in dev (tsx) and from the bundled dist/.
  const dir = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "migrations");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  const applied = await sql<{ name: string }[]>`SELECT name FROM migrations`;
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;

    const contents = await readFile(path.join(dir, file), "utf8");

    await sql.begin(async (tx) => {
      await tx.unsafe(contents);
      await tx`INSERT INTO migrations (name) VALUES (${file})`;
    });

    console.log(`[migrate] applied ${file}`);
  }
}
