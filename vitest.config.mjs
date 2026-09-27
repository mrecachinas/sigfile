import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.{test,nodetest,browsertest}.js"],
    globals: true,
    globalSetup: "./tests/http-server-setup.js",
    // Same origin as the test server, so relative URLs resolve against it
    environmentOptions: { jsdom: { url: "http://127.0.0.1:3000/" } },
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text", "lcov"],
    },
  },
});
