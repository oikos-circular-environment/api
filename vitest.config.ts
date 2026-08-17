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
		include: ["src/**/*.spec.{ts,tsx}", "cli/**/*.spec.{ts,tsx}"],
		exclude: [
			"src/**/*.e2e.spec.{ts,tsx}",
			"src/**/*.integration.spec.{ts,tsx}",
			"**/node_modules/**",
		],
		coverage: {
			include: ["src/modules/**/use-cases/**"],
		},
	},
});
