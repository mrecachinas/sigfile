import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js", "tests/**/*.browsertest.js"],
    environment: "node",
    globals: true,
    globalSetup: "./tests/browser-setup.js",
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reportsDirectory: "./coverage",
    },
  },
});
