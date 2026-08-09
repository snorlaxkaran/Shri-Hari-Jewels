import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export const isIntegrationDbAvailable = (): boolean =>
  Boolean(process.env.DATABASE_URL?.startsWith("postgresql"));

export const uniqueSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default async function globalSetup(): Promise<void> {
  if (!isIntegrationDbAvailable()) {
    process.env.VITEST_INTEGRATION_READY = "0";
    return;
  }

  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      cwd: serverRoot,
      stdio: "pipe",
      env: process.env,
    });
    process.env.VITEST_INTEGRATION_READY = "1";
  } catch {
    process.env.VITEST_INTEGRATION_READY = "0";
    console.warn(
      "[integration] Postgres unreachable — integration tests will be skipped. Start Docker: docker compose up -d",
    );
  }
}

export const integrationTestsReady = (): boolean =>
  process.env.VITEST_INTEGRATION_READY === "1";
