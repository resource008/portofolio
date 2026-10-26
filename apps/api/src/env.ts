import { existsSync } from "node:fs";

// Load apps/api/.env (Node 22 native env file loader).
if (existsSync(".env")) {
  process.loadEnvFile();
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:5173",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "",
  betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  adminGithubUsernames: splitList(process.env.ADMIN_GITHUB_USERNAMES),
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  trustProxy: process.env.TRUST_PROXY === "true",
};

// Refuse to start with a missing or placeholder auth secret: a guessable secret
// lets anyone forge admin sessions.
const PLACEHOLDER_SECRETS = new Set(["", "change-me-in-production"]);
if (env.nodeEnv === "production" && (PLACEHOLDER_SECRETS.has(env.betterAuthSecret) || env.betterAuthSecret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET must be a random string of at least 32 characters in production.");
}
if (env.adminGithubUsernames.length === 0) {
  console.warn("ADMIN_GITHUB_USERNAMES is empty: no one can sign in to the admin panel.");
}
