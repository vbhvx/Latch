import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks", // isolates memory and avoids connection clashes
    fileParallelism: false, // run test suites sequentially for clean database state
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts"],
    },
  },
});
