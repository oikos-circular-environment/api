import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
	Resend: class {
		emails = { send: sendMock };
	},
}));

describe("resend-email-provider", () => {
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

		process.env.EMAIL_PROVIDER = "resend";
		process.env.RESEND_API_KEY = "test-api-key";
		process.env.RESEND_FROM_EMAIL = "from@example.com";
		process.env.JWT_SECRET = "test-jwt-secret";
		process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
		process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-0123456789abcdef";
		process.env.REDIS_URL = "redis://localhost:6379/0";
		process.env.ADMIN_USERNAME = "test-admin";
		process.env.ADMIN_PASSWORD = "test-password";
		process.env.MINIO_ENDPOINT = "localhost";
		process.env.MINIO_ACCESS_KEY = "test";
		process.env.MINIO_SECRET_KEY = "test";
		sendMock.mockReset();
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

	it("sends html and text with an idempotency key scoped to the message", async () => {
		sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
		const { ResendEmailProvider } = await import("./resend-email-provider.js");
		const renderer = {
			render: vi.fn().mockResolvedValue({
				html: "<p>hello</p>",
				text: "hello",
			}),
		};
		const provider = new ResendEmailProvider(renderer);

		await provider.send({
			to: "user@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: { url: "https://example.com/reset" },
		});

		expect(renderer.render).toHaveBeenCalledWith("reset-password", {
			url: "https://example.com/reset",
		});
		expect(sendMock).toHaveBeenCalledWith(
			{
				from: "from@example.com",
				to: "user@example.com",
				subject: "Reset your password",
				html: "<p>hello</p>",
				text: "hello",
			},
			{
				idempotencyKey: expect.stringMatching(
					/^reset-password\/user@example\.com\/[0-9a-f]{32}$/,
				),
			},
		);
	});

	it("gives a different idempotency key to a second reset with a new token", async () => {
		sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
		const { ResendEmailProvider } = await import("./resend-email-provider.js");
		const renderer = {
			render: vi
				.fn()
				.mockResolvedValue({ html: "<p>hello</p>", text: "hello" }),
		};
		const provider = new ResendEmailProvider(renderer);

		const message = {
			to: "user@example.com",
			subject: "Reset your password",
			type: "reset-password",
		};

		await provider.send({ ...message, payload: { token: "first-token" } });
		await provider.send({ ...message, payload: { token: "second-token" } });

		const [firstKey, secondKey] = sendMock.mock.calls.map(
			(call) => call[1].idempotencyKey,
		);
		expect(firstKey).not.toBe(secondKey);
	});

	it("reuses the idempotency key when the same message is retried", async () => {
		sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
		const { ResendEmailProvider } = await import("./resend-email-provider.js");
		const renderer = {
			render: vi
				.fn()
				.mockResolvedValue({ html: "<p>hello</p>", text: "hello" }),
		};
		const provider = new ResendEmailProvider(renderer);

		const message = {
			to: "user@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: { token: "same-token" },
		};

		await provider.send(message);
		await provider.send(message);

		const [firstKey, secondKey] = sendMock.mock.calls.map(
			(call) => call[1].idempotencyKey,
		);
		expect(firstKey).toBe(secondKey);
	});

	it("throws an error with context when the SDK returns an error", async () => {
		sendMock.mockResolvedValue({
			data: null,
			error: { message: "Invalid API key", name: "Error" },
		});
		const { ResendEmailProvider } = await import("./resend-email-provider.js");
		const renderer = {
			render: vi.fn().mockResolvedValue({
				html: "<p>hello</p>",
				text: "hello",
			}),
		};
		const provider = new ResendEmailProvider(renderer);

		await expect(
			provider.send({
				to: "user@example.com",
				subject: "Verify your email",
				type: "verify-email",
				payload: { url: "https://example.com/verify" },
			}),
		).rejects.toThrow(
			"Failed to send email via Resend: Invalid API key (type=verify-email, to=user@example.com)",
		);
	});
});
