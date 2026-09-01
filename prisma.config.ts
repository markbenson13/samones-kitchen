import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// .env is the production fallback; .env.development (gitignored, not
// committed) overrides it for local CLI usage (db push, generate, etc.) so
// schema changes land on the dev database by default, not production.
loadEnv({ quiet: true });
loadEnv({ path: ".env.development", override: true, quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
