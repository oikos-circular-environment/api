import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
	const originalEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		const keys = [
			"NODE_ENV",
			"DATABASE_URL",
			"BETTER_AUTH_SECRET",
			"REDIS_URL",
			"ADMIN_USERNAME",
			"ADMIN_PASSWORD",
			"REQUIRE_EMAIL_VERIFICATION",
		];

		for (const key of keys) {
			originalEnv[key] = process.env[key];
		}

		process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
		process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
		process.env.REDIS_URL = "redis://localhost:6379/0";
		process.env.ADMIN_USERNAME = "test-admin";
		process.env.ADMIN_PASSWORD = "test-password";
		process.env.MINIO_ENDPOINT = "localhost";
		process.env.MINIO_ACCESS_KEY = "test";
		process.env.MINIO_SECRET_KEY = "test";

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

	it("defaults REQUIRE_EMAIL_VERIFICATION to false", async () => {
		delete process.env.REQUIRE_EMAIL_VERIFICATION;
		const { env } = await import("./index.js");

		expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(false);
	});

	it("parses REQUIRE_EMAIL_VERIFICATION=true as boolean true", async () => {
		process.env.REQUIRE_EMAIL_VERIFICATION = "true";
		const { env } = await import("./index.js");

		expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(true);
	});

	it("parses REQUIRE_EMAIL_VERIFICATION=TRUE as boolean true", async () => {
		process.env.REQUIRE_EMAIL_VERIFICATION = "TRUE";
		const { env } = await import("./index.js");

		expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(true);
	});

	it("parses REQUIRE_EMAIL_VERIFICATION=false as boolean false", async () => {
		process.env.REQUIRE_EMAIL_VERIFICATION = "false";
		const { env } = await import("./index.js");

		expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(false);
	});
});
