import postgres from "postgres";
import { env } from "../env";

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy apps/api/.env.example to .env.");
}

export const sql = postgres(env.databaseUrl, {
  max: 10,
  onnotice: () => {},
});
