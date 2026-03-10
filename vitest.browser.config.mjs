import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.browsertest.ts"],
    environment: "node",
    globals: true,
    globalSetup: "./tests/browser-setup.ts",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      reportsDirectory: "./coverage",
    },
  },
});
