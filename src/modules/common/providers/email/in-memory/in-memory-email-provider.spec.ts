import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEmailProvider } from "./in-memory-email-provider.js";

describe("in-memory-email-provider", () => {
	let provider: InMemoryEmailProvider;

	beforeEach(() => {
		provider = new InMemoryEmailProvider();
	});

	it("captures sent email with recipient, subject and payload", async () => {
		await provider.send({
			to: "ada@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: {
				url: "http://localhost/reset?token=abc123",
				token: "abc123",
			},
		});

		expect(provider.messages).toHaveLength(1);
		expect(provider.messages[0]).toEqual({
			to: "ada@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: {
				url: "http://localhost/reset?token=abc123",
				token: "abc123",
			},
		});
	});

	it("filters messages by recipient and type", async () => {
		await provider.send({
			to: "ada@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: { token: "abc123" },
		});
		await provider.send({
			to: "grace@example.com",
			subject: "Verify your email",
			type: "verify-email",
			payload: { token: "def456" },
		});

		const resetEmails = provider.getMessages(
			"ada@example.com",
			"reset-password",
		);

		expect(resetEmails).toHaveLength(1);
		expect(resetEmails[0]?.to).toBe("ada@example.com");
		expect(resetEmails[0]?.type).toBe("reset-password");
	});

	it("returns the reset token for a given email", async () => {
		await provider.send({
			to: "ada@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: { token: "reset-token-123" },
		});

		const token = provider.getResetTokenForEmail("ada@example.com");

		expect(token).toBe("reset-token-123");
	});

	it("returns null when no reset token was sent to the email", () => {
		const token = provider.getResetTokenForEmail("ada@example.com");

		expect(token).toBeNull();
	});

	it("clears all captured messages", async () => {
		await provider.send({
			to: "ada@example.com",
			subject: "Reset your password",
			type: "reset-password",
			payload: { token: "abc123" },
		});

		provider.clear();

		expect(provider.messages).toHaveLength(0);
		expect(provider.getResetTokenForEmail("ada@example.com")).toBeNull();
	});
});
