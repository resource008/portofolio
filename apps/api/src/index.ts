import { serve } from "@hono/node-server";
import { runMigrations } from "./db/migrate";
import { env } from "./env";

// Better Auth checks the schema when it loads, so the tables must exist before app.ts is imported.
await runMigrations();
const { default: app } = await import("./app");

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`API running on http://localhost:${info.port}`);
});

export default app;
