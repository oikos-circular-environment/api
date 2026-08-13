import { describe, expect, it } from "vitest";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { VerifyEmailUseCase } from "./verify-email-use-case.js";

describe("verify-email-use-case", () => {
	it("marks the user's email as verified given a valid token", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new VerifyEmailUseCase(provider);

		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});
		await provider.sendVerificationEmail("ada@example.com");
		const token = provider.getPendingVerificationToken("ada@example.com");

		await sut.execute(token as string);

		const user = provider.users.find(
			(item) => item.email === "ada@example.com",
		);
		expect(user?.emailVerified).toBe(true);
	});

	it("throws for an invalid token", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new VerifyEmailUseCase(provider);

		await expect(sut.execute("invalid-token")).rejects.toBeInstanceOf(
			InvalidResetTokenError,
		);
	});
});
