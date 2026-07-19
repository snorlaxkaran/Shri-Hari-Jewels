import "dotenv/config";
import { defineConfig } from "prisma/config";

/** CLI (db push / migrate) needs a direct Postgres URL; Supabase pooler (6543) is not supported. */
const cliDatabaseUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: cliDatabaseUrl ? { url: cliDatabaseUrl } : undefined,
});
