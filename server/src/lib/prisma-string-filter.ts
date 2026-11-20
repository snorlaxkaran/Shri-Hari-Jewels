import { isMysqlDatabaseUrl } from "./coerce-string-array.js";

/** Case-insensitive `contains` on PostgreSQL; collation-based match on MySQL. */
export const stringContains = (needle: string) =>
  isMysqlDatabaseUrl()
    ? { contains: needle }
    : ({ contains: needle, mode: "insensitive" } as const);

export const stringEquals = (value: string) =>
  isMysqlDatabaseUrl()
    ? { equals: value }
    : ({ equals: value, mode: "insensitive" } as const);
