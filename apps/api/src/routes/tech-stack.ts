import { Hono } from "hono";
import { resolveTechLogo } from "../lib/logo";
import { fail, ok } from "../lib/response";
import { requireAdmin } from "../middleware/auth";

export const techStackRoutes = new Hono();

techStackRoutes.get("/admin/tech-stack/resolve", requireAdmin, async (c) => {
  const name = (c.req.query("name") ?? "").trim();
  const logo = resolveTechLogo(name);

  if (!name || !logo) {
    return fail(c, "Nama stack tidak valid.", 422);
  }

  return ok(c, { name, logo_url: logo, svg_source: "devicon" });
});
