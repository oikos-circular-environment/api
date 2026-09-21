import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEYS = [
	"NODE_ENV",
	"CORS_ALLOWED_ORIGINS",
	"WEB_APP_URL",
	"APP_PUBLIC_URL",
] as const;

function matches(origins: (string | RegExp)[], origin: string) {
	return origins.some((o) =>
		typeof o === "string" ? o === origin : o.test(origin),
	);
}

describe("getCorsAllowedOrigins", () => {
	const originalEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of KEYS) {
			originalEnv[key] = process.env[key];
		}
		vi.resetModules();
	});

	afterEach(() => {
		for (const [key, value] of Object.entries(originalEnv)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	});

	it("aceita origens locais e as configuradas fora de produção", async () => {
		process.env.NODE_ENV = "dev";
		process.env.CORS_ALLOWED_ORIGINS = "https://oikos.company";
		const { getCorsAllowedOrigins } = await import("./index.js");
		const origins = getCorsAllowedOrigins();

		expect(matches(origins, "https://oikos.company")).toBe(true);
		expect(matches(origins, "http://localhost:3000")).toBe(true);
		expect(matches(origins, "http://local-oikos:3000")).toBe(true);
		expect(matches(origins, "http://local-api")).toBe(true);
		expect(matches(origins, "https://evil.com")).toBe(false);
	});

	it("em produção devolve só as origens configuradas", async () => {
		process.env.NODE_ENV = "production";
		process.env.WEB_APP_URL = "https://oikos.company";
		process.env.APP_PUBLIC_URL = "https://api.oikos.company";
		process.env.CORS_ALLOWED_ORIGINS =
			"https://oikos.company, https://api.oikos.company";
		const { getCorsAllowedOrigins } = await import("./index.js");

		expect(getCorsAllowedOrigins()).toEqual([
			"https://oikos.company",
			"https://api.oikos.company",
		]);
	});
});
