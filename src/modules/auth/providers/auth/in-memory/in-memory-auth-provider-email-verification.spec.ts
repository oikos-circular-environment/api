import { describe, expect, it } from "vitest";
import { EmailNotVerifiedError } from "@/modules/auth/errors/email-not-verified-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { InMemoryAuthProvider } from "./in-memory-auth-provider.js";

describe("in-memory-auth-provider-email-verification", () => {
	it("allows sign-in without verification when the flag is off", async () => {
		const provider = new InMemoryAuthProvider();
		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		const result = await provider.signInWithPassword({
			email: "ada@example.com",
			password: "Test@123456",
		});

		expect(result.user.email).toBe("ada@example.com");
	});

	it("blocks sign-in for unverified users when the flag is on", async () => {
		const provider = new InMemoryAuthProvider({
			requireEmailVerification: true,
		});
		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		let thrownError: unknown;
		try {
			await provider.signInWithPassword({
				email: "ada@example.com",
				password: "Test@123456",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(EmailNotVerifiedError);
		if (thrownError instanceof EmailNotVerifiedError) {
			expect(thrownError.code).toBe("EMAIL_NOT_VERIFIED");
			expect(thrownError.statusCode).toBe(403);
		}
	});

	it("sends a verification email and allows sign-in after verification", async () => {
		const provider = new InMemoryAuthProvider({
			requireEmailVerification: true,
		});
		await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "Test@123456",
		});

		await provider.sendVerificationEmail("ada@example.com");
		const token = provider.getPendingVerificationToken("ada@example.com");
		expect(token).not.toBeNull();

		await provider.verifyEmail(token ?? "");

		const result = await provider.signInWithPassword({
			email: "ada@example.com",
			password: "Test@123456",
		});
		expect(result.user.emailVerified).toBe(true);
	});

	it("throws invalid-reset-token-error for an unknown verification token", async () => {
		const provider = new InMemoryAuthProvider({
			requireEmailVerification: true,
		});

		let thrownError: unknown;
		try {
			await provider.verifyEmail("unknown-token");
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(InvalidResetTokenError);
	});
});
