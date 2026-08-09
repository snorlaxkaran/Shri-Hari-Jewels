import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/integration/**/*.integration.test.ts"],
    globalSetup: ["src/__tests__/integration/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
