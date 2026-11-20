/**
 * Runs before db:deploy on Render — fails fast with actionable errors when DATABASE_URL/DIRECT_URL are wrong.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const migrationDatabaseUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

const redactUrl = (url: string): string => {
  try {
    const parsed = new URL(url.replace(/^prisma\+postgres:\/\//, "postgresql://"));
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "(invalid URL)";
  }
};

const printFix = (hostHint: string) => {
  console.error(`
[FATAL] Cannot reach the production database during deploy.

What this means:
  The Postgres tenant in your connection string no longer exists (deleted/paused project,
  wrong copy-paste, or expired Prisma Postgres / Supabase branch).
  Error referenced host like: ${hostHint || "unknown"}

Fix in Render → shri-hari-jewels-api → Environment:
  1. Create or restore a Postgres database (Neon, Supabase, or Prisma Postgres).
  2. Set DIRECT_URL to the direct connection (port 5432, no pooler) — used for db push during build.
  3. Set DATABASE_URL to the runtime URL (Supabase: port 6543 with ?pgbouncer=true).
  4. Manual Deploy → Deploy latest commit.
  5. Build runs db:seed-if-empty when the DB has no users — first deploy on a new DB is expected.

Docs: server/README.md → "Database connection failed on Render"
`);
};

const main = async () => {
  if (!migrationDatabaseUrl) {
    console.error(
      "[FATAL] DIRECT_URL or DATABASE_URL is not set. Add them in Render → Environment before deploying.",
    );
    process.exit(1);
  }

  console.log(`Database preflight (deploy): ${redactUrl(migrationDatabaseUrl)}`);

  const prisma = new PrismaClient({
    datasources: { db: { url: migrationDatabaseUrl } },
  });

  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log("Database preflight OK.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hostMatch = migrationDatabaseUrl.match(/@([^/?:]+)/);
    const hostHint = hostMatch?.[1] ?? "";
    console.error("Database preflight failed:", message);
    if (
      /ENOTFOUND|tenant\/user|not found|FATAL|P1001|P1003|Authentication failed/i.test(
        message,
      )
    ) {
      printFix(hostHint);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();