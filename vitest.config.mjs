import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,nodetest,browsertest}.js"],
    globals: true,
    globalSetup: "./tests/http-server-setup.js",
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text", "lcov"],
    },
  },
});
