import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { bearer } from "better-auth/plugins";
import { Pool } from "pg";
import { env } from "../env";

export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  database: new Pool({ connectionString: env.databaseUrl }),
  trustedOrigins: [env.webOrigin],
  socialProviders: {
    github: {
      clientId: env.githubClientId,
      clientSecret: env.githubClientSecret,
      mapProfileToUser: (profile) => ({
        name: profile.name ?? profile.login,
        email: profile.email,
        image: profile.avatar_url,
        username: profile.login,
      }),
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [bearer()],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const username = (user as { username?: string }).username;

          // Fail closed: an empty allowlist admits nobody.
          if (!username || !env.adminGithubUsernames.includes(username)) {
            throw new APIError("FORBIDDEN", {
              message: "Akun GitHub ini tidak diizinkan.",
            });
          }

          return { data: user };
        },
      },
    },
  },
});
