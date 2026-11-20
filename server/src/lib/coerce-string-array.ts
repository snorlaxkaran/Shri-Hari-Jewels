/** Normalize Prisma Json columns (MySQL) or legacy string[] reads into string[]. */
export const coerceStringArray = (value: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const isMysqlDatabaseUrl = (url = process.env.DATABASE_URL ?? ""): boolean =>
  url.startsWith("mysql://") || url.startsWith("mysql:");
