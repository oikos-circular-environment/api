import { APIError } from "better-auth";
import { describe, expect, it, vi } from "vitest";
import { AuthProviderError } from "@/modules/auth/errors/auth-provider-error.js";
import { EmailNotVerifiedError } from "@/modules/auth/errors/email-not-verified-error.js";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import type { AuthApiClient } from "./better-auth-auth-provider.js";
import { BetterAuthAuthProvider } from "./better-auth-auth-provider.js";

describe("better-auth-auth-provider", () => {
	describe("error-translation", () => {
		function providerWithApi(api: Partial<AuthApiClient>) {
			return new BetterAuthAuthProvider({
				api: api as unknown as AuthApiClient,
			});
		}

		it("translates invalid-email-or-password to invalid-credentials-error", async () => {
			const provider = providerWithApi({
				signInEmail: vi.fn().mockRejectedValue(
					new APIError("UNAUTHORIZED", {
						code: "INVALID_EMAIL_OR_PASSWORD",
						message: "Invalid email or password",
					}),
				),
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

			expect(thrownError).toBeInstanceOf(InvalidCredentialsError);
			if (thrownError instanceof InvalidCredentialsError) {
				expect(thrownError.code).toBe("INVALID_CREDENTIALS");
				expect(thrownError.statusCode).toBe(401);
			}
		});

		it("translates user-already-exists to user-already-exists-error", async () => {
			const provider = providerWithApi({
				signUpEmail: vi.fn().mockRejectedValue(
					new APIError("UNPROCESSABLE_ENTITY", {
						code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
						message: "User already exists. Use another email.",
					}),
				),
			});

			let thrownError: unknown;
			try {
				await provider.signUpWithPassword({
					name: "Ada Lovelace",
					email: "ada@example.com",
					password: "Test@123456",
				});
			} catch (error) {
				thrownError = error;
			}

			expect(thrownError).toBeInstanceOf(UserAlreadyExistsError);
			if (thrownError instanceof UserAlreadyExistsError) {
				expect(thrownError.code).toBe("USER_ALREADY_EXISTS");
				expect(thrownError.statusCode).toBe(409);
			}
		});

		it("translates password-too-short to weak-password-error", async () => {
			const provider = providerWithApi({
				signUpEmail: vi.fn().mockRejectedValue(
					new APIError("BAD_REQUEST", {
						code: "PASSWORD_TOO_SHORT",
						message: "Password must be at least 6 characters",
					}),
				),
			});

			let thrownError: unknown;
			try {
				await provider.signUpWithPassword({
					name: "Ada Lovelace",
					email: "ada@example.com",
					password: "123",
				});
			} catch (error) {
				thrownError = error;
			}

			expect(thrownError).toBeInstanceOf(WeakPasswordError);
			if (thrownError instanceof WeakPasswordError) {
				expect(thrownError.code).toBe("WEAK_PASSWORD");
				expect(thrownError.statusCode).toBe(400);
			}
		});

		it("translates invalid-token to invalid-reset-token-error", async () => {
			const provider = providerWithApi({
				resetPassword: vi.fn().mockRejectedValue(
					new APIError("BAD_REQUEST", {
						code: "INVALID_TOKEN",
						message: "Invalid token",
					}),
				),
			});

			let thrownError: unknown;
			try {
				await provider.resetPassword({
					token: "invalid",
					newPassword: "NewPass@123",
				});
			} catch (error) {
				thrownError = error;
			}

			expect(thrownError).toBeInstanceOf(InvalidResetTokenError);
			if (thrownError instanceof InvalidResetTokenError) {
				expect(thrownError.code).toBe("INVALID_RESET_TOKEN");
				expect(thrownError.statusCode).toBe(400);
			}
		});

		it("translates email-not-verified to email-not-verified-error", async () => {
			const provider = providerWithApi({
				signInEmail: vi.fn().mockRejectedValue(
					new APIError("FORBIDDEN", {
						code: "EMAIL_NOT_VERIFIED",
						message: "Email not verified",
					}),
				),
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

		it("preserves code and status for unmapped api errors", async () => {
			const provider = providerWithApi({
				getSession: vi.fn().mockRejectedValue(
					new APIError("TOO_MANY_REQUESTS", {
						code: "RATE_LIMITED",
						message: "Too many requests",
					}),
				),
			});

			let thrownError: unknown;
			try {
				await provider.getSession(new Headers());
			} catch (error) {
				thrownError = error;
			}

			expect(thrownError).toBeInstanceOf(AuthProviderError);
			if (thrownError instanceof AuthProviderError) {
				expect(thrownError.code).toBe("RATE_LIMITED");
				expect(thrownError.statusCode).toBe(429);
			}
		});

		it("wraps non-api errors as auth-provider-error with 500", async () => {
			const provider = providerWithApi({
				signInEmail: vi
					.fn()
					.mockRejectedValue(new Error("database connection lost")),
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

			expect(thrownError).toBeInstanceOf(AuthProviderError);
			if (thrownError instanceof AuthProviderError) {
				expect(thrownError.code).toBe("AUTH_PROVIDER_ERROR");
				expect(thrownError.statusCode).toBe(500);
			}
		});
	});
});
