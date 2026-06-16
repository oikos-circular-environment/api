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
		globalSetup: "./src/test/integration-setup.ts",
		setupFiles: ["./src/test/integration-env.ts"],
		include: ["src/**/*.integration.spec.ts", "src/**/*.e2e.spec.ts"],
		fileParallelism: false,
	},
});
