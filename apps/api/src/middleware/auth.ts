import { createMiddleware } from "hono/factory";
import { env } from "../env";
import { auth } from "../lib/auth";
import { fail } from "../lib/response";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  username?: string | null;
}

/**
 * Protects `/api/admin/*` routes: requires a valid Better Auth session
 * (cookie or Bearer token) whose GitHub username is in the allowlist.
 */
export const requireAdmin = createMiddleware<{
  Variables: { admin: AdminUser };
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return fail(c, "Tidak terautentikasi.", 401);
  }

  const user = session.user as AdminUser;
  const username = user.username ?? null;

  // Fail closed: an empty allowlist admits nobody.
  if (!username || !env.adminGithubUsernames.includes(username)) {
    return fail(c, "Akun ini tidak diizinkan.", 403);
  }

  c.set("admin", user);
  await next();
});
