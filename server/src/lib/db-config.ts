export type DatabaseKind = "postgresql" | "sqlite" | "missing" | "invalid";

export const getDatabaseKind = (databaseUrl?: string): DatabaseKind => {
  const url = databaseUrl?.trim() ?? "";
  if (!url) return "missing";
  if (url.startsWith("file:") || url.includes("sqlite")) return "sqlite";
  if (
    url.startsWith("postgresql://") ||
    url.startsWith("postgres://") ||
    url.startsWith("prisma+postgres://")
  ) {
    return "postgresql";
  }
  return "invalid";
};

export const assertProductionDatabase = (): void => {
  if (process.env.NODE_ENV !== "production") return;

  const kind = getDatabaseKind(process.env.DATABASE_URL);
  if (kind === "postgresql") return;

  const messages: Record<Exclude<DatabaseKind, "postgresql">, string> = {
    missing:
      "DATABASE_URL is not set. Add your Prisma Postgres connection string in Render → Environment.",
    sqlite:
      "DATABASE_URL points to SQLite (file:./dev.db). Sales will be lost when Render restarts. Use Prisma Postgres instead.",
    invalid:
      "DATABASE_URL is not a valid Postgres connection string. Use postgresql:// or prisma+postgres:// from Prisma Data Platform.",
  };

  console.error(`[FATAL] ${messages[kind]}`);
  process.exit(1);
};

export const getDatabaseHost = (databaseUrl?: string): string | null => {
  const url = databaseUrl?.trim();
  if (!url) return null;

  try {
    if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
      return new URL(url).hostname;
    }
    if (url.startsWith("prisma+postgres://")) {
      return "prisma-accelerate";
    }
    if (url.startsWith("file:")) {
      return "local-sqlite";
    }
  } catch {
    return null;
  }

  return null;
};
