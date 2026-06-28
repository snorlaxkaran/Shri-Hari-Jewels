import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Use direct Postgres for deploy SQL; Supabase transaction pooler breaks DDL/migrations. */
const migrationDatabaseUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL;

export const migrationPrisma = new PrismaClient(
  migrationDatabaseUrl
    ? { datasources: { db: { url: migrationDatabaseUrl } } }
    : undefined,
);
