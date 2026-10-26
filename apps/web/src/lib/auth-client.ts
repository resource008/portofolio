import { createAuthClient } from "better-auth/react";

// Same-origin: the Vite dev server proxies /api -> Hono (port 3001),
// so cookies stay same-origin in development.
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
});

export const { useSession, signIn, signOut } = authClient;
