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
		include: ["src/**/*.spec.ts", "cli/**/*.spec.ts"],
		exclude: [
			"src/**/*.e2e.spec.ts",
			"src/**/*.integration.spec.ts",
			"**/node_modules/**",
		],
		coverage: {
			include: ["src/modules/**/use-cases/**"],
		},
	},
});
