import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { runMigrations } from "./db/migrate";
import { env } from "./env";
import { auth } from "./lib/auth";
import { analyticsRoutes } from "./routes/analytics";
import { announcementRoutes } from "./routes/announcements";
import { dashboardRoutes } from "./routes/dashboard";
import { educationRoutes } from "./routes/education";
import { experienceRoutes } from "./routes/experience";
import { inboxRoutes } from "./routes/inbox";
import { notificationRoutes } from "./routes/notifications";
import { profileRoutes } from "./routes/profile";
import { projectRoutes } from "./routes/projects";
import { socialLinkRoutes } from "./routes/social-links";
import { techStackRoutes } from "./routes/tech-stack";
import { uploadRoutes } from "./routes/uploads";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.webOrigin,
    credentials: true,
  }),
);

app.get("/api/health", (c) => c.json({ success: true, data: { status: "ok" } }));

app.route("/api", profileRoutes);
app.route("/api", educationRoutes);
app.route("/api", experienceRoutes);
app.route("/api", projectRoutes);
app.route("/api", announcementRoutes);
app.route("/api", socialLinkRoutes);
app.route("/api", inboxRoutes);
app.route("/api", analyticsRoutes);
app.route("/api", dashboardRoutes);
app.route("/api", notificationRoutes);
app.route("/api", techStackRoutes);
app.route("/api", uploadRoutes);

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

await runMigrations();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`API running on http://localhost:${info.port}`);
});

export default app;

