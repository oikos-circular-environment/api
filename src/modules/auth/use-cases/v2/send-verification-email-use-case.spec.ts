import { describe, expect, it } from "vitest";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { SendVerificationEmailUseCase } from "./send-verification-email-use-case.js";

describe("send-verification-email-use-case", () => {
	it("sends a verification email for an existing user", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SendVerificationEmailUseCase(provider);

		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		await sut.execute("ada@example.com");

		expect(
			provider.getPendingVerificationToken("ada@example.com"),
		).not.toBeNull();
	});

	it("does not throw for an unknown email", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new SendVerificationEmailUseCase(provider);

		await expect(sut.execute("unknown@example.com")).resolves.toBeUndefined();
	});
});
