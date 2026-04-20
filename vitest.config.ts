import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    root: "./",
    include: ["src/modules/**/use-cases/**/*.spec.ts"],
    coverage: {
      include: ["src/modules/**/use-cases/**"],
    },
  },
});
