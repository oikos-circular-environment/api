import { randomUUID } from "node:crypto";
import { APIError } from "better-auth";
import { describe, expect, it, vi } from "vitest";
import { AuthProviderError } from "@/modules/auth/errors/auth-provider-error.js";
import { EmailNotVerifiedError } from "@/modules/auth/errors/email-not-verified-error.js";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import type { AuthProvider } from "../auth-provider.js";
import { describeAuthProviderContract } from "../auth-provider-contract.js";
import type {
	AuthApiClient,
	AuthApiSession,
	AuthApiUser,
} from "./better-auth-auth-provider.js";
import { BetterAuthAuthProvider } from "./better-auth-auth-provider.js";

const MIN_PASSWORD_LENGTH = 6;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const SESSION_COOKIE_NAME = "better-auth.session_token";

type FakeUserRecord = {
	user: AuthApiUser;
	password: string;
};

class FakeAuthApi implements AuthApiClient {
	public records = new Map<string, FakeUserRecord>();
	public sessions = new Map<string, AuthApiSession>();
	public resetTokens = new Map<string, { email: string; expiresAt: Date }>();

	async signUpEmail({
		body: { name, email, password },
	}: {
		body: { name: string; email: string; password: string };
		headers: Headers;
	}) {
		assertPasswordLength(password);
		if (this.findByEmail(email)) {
			throw new APIError("UNPROCESSABLE_ENTITY", {
				code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
				message: "User already exists. Use another email.",
			});
		}

		const user: AuthApiUser = {
			id: randomUUID(),
			email,
			name,
			emailVerified: false,
			image: null,
			role: "user",
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		this.records.set(user.id, { user, password });

		const session = this.createSession(user.id);
		return { token: session.token, user };
	}

	async signInEmail({
		body: { email, password },
	}: {
		body: { email: string; password: string };
		headers: Headers;
	}) {
		const record = this.findByEmail(email);
		if (!record || record.password !== password) {
			throw new APIError("UNAUTHORIZED", {
				code: "INVALID_EMAIL_OR_PASSWORD",
				message: "Invalid email or password",
			});
		}

		const session = this.createSession(record.user.id);
		return { token: session.token, user: record.user };
	}

	async getSession({ headers }: { headers: Headers }) {
		const token = extractSessionToken(headers);
		if (!token) return null;

		const session = this.sessions.get(token);
		if (!session) return null;

		const record = this.records.get(session.userId);
		if (!record) return null;
		return { session, user: record.user };
	}

	async signOut({ headers }: { headers: Headers }) {
		const token = extractSessionToken(headers);
		if (token) this.sessions.delete(token);
		return { success: true };
	}

	async changePassword({
		body: { currentPassword, newPassword },
		headers,
	}: {
		body: { currentPassword: string; newPassword: string };
		headers: Headers;
	}) {
		const session = await this.getSession({ headers });
		if (!session) {
			throw new APIError("UNAUTHORIZED", {
				code: "SESSION_EXPIRED",
				message: "Session expired",
			});
		}

		const record = this.records.get(session.user.id);
		if (!record || record.password !== currentPassword) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_PASSWORD",
				message: "Invalid password",
			});
		}

		assertPasswordLength(newPassword);
		record.password = newPassword;
		return { status: true };
	}

	async requestPasswordReset({ body: { email } }: { body: { email: string } }) {
		if (this.findByEmail(email)) {
			this.resetTokens.set(randomUUID(), {
				email,
				expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
			});
		}
		return {
			status: true,
			message:
				"If this email exists in our system, check your email for the reset link",
		};
	}

	async resetPassword({
		body: { newPassword, token },
	}: {
		body: { newPassword: string; token: string };
	}) {
		const record = this.resetTokens.get(token);
		if (!record || record.expiresAt.getTime() <= Date.now()) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		assertPasswordLength(newPassword);

		const userRecord = this.findByEmail(record.email);
		if (!userRecord) {
			throw new APIError("BAD_REQUEST", {
				code: "INVALID_TOKEN",
				message: "Invalid token",
			});
		}

		userRecord.password = newPassword;
		this.resetTokens.delete(token);
		return { status: true };
	}

	getPendingResetToken(email: string): string | null {
		for (const [token, record] of this.resetTokens) {
			if (record.email === email && record.expiresAt.getTime() > Date.now()) {
				return token;
			}
		}
		return null;
	}

	private findByEmail(email: string): FakeUserRecord | null {
		for (const record of this.records.values()) {
			if (record.user.email === email) return record;
		}
		return null;
	}

	private createSession(userId: string): AuthApiSession {
		const session: AuthApiSession = {
			id: randomUUID(),
			token: randomUUID(),
			expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
			userId,
		};
		this.sessions.set(session.token, session);
		return session;
	}
}

const apiByProvider = new WeakMap<AuthProvider, FakeAuthApi>();

describe("better-auth-auth-provider", () => {
	describeAuthProviderContract({
		createProvider: () => {
			const api = new FakeAuthApi();
			const provider = new BetterAuthAuthProvider({ api });
			apiByProvider.set(provider, api);
			return provider;
		},
		getResetToken: (provider, email) => {
			const api = apiByProvider.get(provider);
			const token = api?.getPendingResetToken(email) ?? null;
			expect(token).not.toBeNull();
			if (token) return Promise.resolve(token);
			throw new Error("expected a pending reset token");
		},
	});

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

function assertPasswordLength(password: string) {
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new APIError("BAD_REQUEST", {
			code: "PASSWORD_TOO_SHORT",
			message: "Password must be at least 6 characters",
		});
	}
}

function extractSessionToken(headers: Headers): string | null {
	const authorization = headers.get("authorization");
	if (authorization?.startsWith("Bearer ")) {
		return authorization.slice("Bearer ".length);
	}

	const cookie = headers.get("cookie");
	if (!cookie) return null;

	const prefix = `${SESSION_COOKIE_NAME}=`;
	const match = cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(prefix));
	return match ? match.slice(prefix.length) : null;
}
