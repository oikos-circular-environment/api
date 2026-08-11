import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("make-email-provider", () => {
	const originalEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		const keys = [
			"EMAIL_PROVIDER",
			"RESEND_API_KEY",
			"RESEND_FROM_EMAIL",
			"JWT_SECRET",
			"DATABASE_URL",
			"BETTER_AUTH_SECRET",
			"REDIS_URL",
			"ADMIN_USERNAME",
			"ADMIN_PASSWORD",
			"MINIO_ENDPOINT",
			"MINIO_ACCESS_KEY",
			"MINIO_SECRET_KEY",
		];

		for (const key of keys) {
			originalEnv[key] = process.env[key];
		}

		process.env.RESEND_API_KEY = "test-resend-key";
		process.env.RESEND_FROM_EMAIL = "test@example.com";
		process.env.JWT_SECRET = "test-jwt-secret";
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

	it("returns ConsoleEmailProvider by default", async () => {
		delete process.env.EMAIL_PROVIDER;
		const { makeEmailProvider } = await import("./make-email-provider.js");

		const provider = makeEmailProvider();

		expect(provider.constructor.name).toBe("ConsoleEmailProvider");
	});

	it("returns ConsoleEmailProvider when EMAIL_PROVIDER is console", async () => {
		process.env.EMAIL_PROVIDER = "console";
		const { makeEmailProvider } = await import("./make-email-provider.js");

		const provider = makeEmailProvider();

		expect(provider.constructor.name).toBe("ConsoleEmailProvider");
	});

	it("returns InMemoryEmailProvider when EMAIL_PROVIDER is in-memory", async () => {
		process.env.EMAIL_PROVIDER = "in-memory";
		const { makeEmailProvider } = await import("./make-email-provider.js");

		const provider = makeEmailProvider();

		expect(provider.constructor.name).toBe("InMemoryEmailProvider");
	});

	it("throws when EMAIL_PROVIDER is resend", async () => {
		process.env.EMAIL_PROVIDER = "resend";
		const { makeEmailProvider } = await import("./make-email-provider.js");

		expect(() => makeEmailProvider()).toThrow(
			"Resend email provider is not implemented yet (E04, api#65).",
		);
	});
});
