import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "./in-memory-auth-provider.js";

describe("in-memory-auth-provider", () => {
	it("exposes pending reset tokens for testing", async () => {
		const provider = new InMemoryAuthProvider();
		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		await provider.requestPasswordReset("ada@example.com");

		const token = provider.getPendingResetToken("ada@example.com");

		expect(token).not.toBeNull();
	});
});
