import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { InvalidRoleError } from "@/modules/auth/errors/invalid-role-error.js";
import { UserAlreadyBannedError } from "@/modules/auth/errors/user-already-banned-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { UserNotBannedError } from "@/modules/auth/errors/user-not-banned-error.js";
import { UserNotFoundError } from "@/modules/auth/errors/user-not-found-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import type { AuthProvider } from "./auth-provider.js";
import { BetterAuthAuthProvider } from "./better-auth/better-auth-auth-provider.js";
import { FakeAuthApi } from "./better-auth/fake-auth-api.js";
import { InMemoryAuthProvider } from "./in-memory/in-memory-auth-provider.js";

const NAME = "Ada Lovelace";
const EMAIL = "ada@example.com";
const PASSWORD = "Test@123456";
const NEW_PASSWORD = "NewPass@123";
const SHORT_PASSWORD = "123";

type AuthProviderContractContext = {
	createProvider: () => AuthProvider;
	getResetToken: (provider: AuthProvider, email: string) => Promise<string>;
	getVerificationToken: (
		provider: AuthProvider,
		email: string,
	) => Promise<string>;
};

function describeAuthProviderContract({
	createProvider,
	getResetToken,
	getVerificationToken,
}: AuthProviderContractContext) {
	it("signs up with password and returns a token and user", async () => {
		const provider = createProvider();

		const result = await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		expect(result.token).toBeTruthy();
		expect(result.user).toMatchObject({
			id: expect.any(String),
			email: EMAIL,
			name: NAME,
			emailVerified: false,
			image: null,
			role: "user",
			createdAt: expect.any(Date),
			updatedAt: expect.any(Date),
		});
	});

	it("throws user-already-exists-error on duplicate email", async () => {
		const provider = createProvider();
		await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		let thrownError: unknown;
		try {
			await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(UserAlreadyExistsError);
		if (thrownError instanceof UserAlreadyExistsError) {
			expect(thrownError.message).toBe("User already exists");
			expect(thrownError.code).toBe("USER_ALREADY_EXISTS");
			expect(thrownError.statusCode).toBe(409);
		}
	});

	it("throws weak-password-error on password shorter than 6 characters", async () => {
		const provider = createProvider();

		let thrownError: unknown;
		try {
			await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: SHORT_PASSWORD,
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

	it("signs in with password and returns a token and user", async () => {
		const provider = createProvider();
		await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		const result = await provider.signInWithPassword({
			email: EMAIL,
			password: PASSWORD,
		});

		expect(result.token).toBeTruthy();
		expect(result.user.email).toBe(EMAIL);
	});

	it("throws invalid-credentials-error on unknown email", async () => {
		const provider = createProvider();

		let thrownError: unknown;
		try {
			await provider.signInWithPassword({
				email: EMAIL,
				password: PASSWORD,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(InvalidCredentialsError);
		if (thrownError instanceof InvalidCredentialsError) {
			expect(thrownError.message).toBe("Invalid credentials");
			expect(thrownError.code).toBe("INVALID_CREDENTIALS");
			expect(thrownError.statusCode).toBe(401);
		}
	});

	it("throws invalid-credentials-error on wrong password", async () => {
		const provider = createProvider();
		await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		let thrownError: unknown;
		try {
			await provider.signInWithPassword({
				email: EMAIL,
				password: "wrong-password",
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

	it("returns null when there is no session for the headers", async () => {
		const provider = createProvider();

		const result = await provider.getSession(new Headers());

		expect(result).toBeNull();
	});

	it("returns the session and user for a valid bearer token", async () => {
		const provider = createProvider();
		const { token } = await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		const result = await provider.getSession(
			new Headers({ authorization: `Bearer ${token}` }),
		);

		expect(result).not.toBeNull();
		if (result) {
			expect(result.session.userId).toBe(result.user.id);
			expect(result.user.email).toBe(EMAIL);
			expect(result.user.role).toBe("user");
		}
	});

	it("returns the session and user for a valid session cookie", async () => {
		const provider = createProvider();
		const { token } = await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		const result = await provider.getSession(
			new Headers({ cookie: `better-auth.session_token=${token}` }),
		);

		expect(result).not.toBeNull();
		if (result) {
			expect(result.user.email).toBe(EMAIL);
		}
	});

	it("signs out and invalidates the session", async () => {
		const provider = createProvider();
		const { token } = await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});
		const headers = new Headers({ authorization: `Bearer ${token}` });

		await provider.signOut(headers);

		await expect(provider.getSession(headers)).resolves.toBeNull();
	});

	it("changes the password and allows sign in with the new password", async () => {
		const provider = createProvider();
		const { token } = await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});
		const headers = new Headers({ authorization: `Bearer ${token}` });

		await provider.changePassword(
			{ currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
			headers,
		);

		const result = await provider.signInWithPassword({
			email: EMAIL,
			password: NEW_PASSWORD,
		});
		expect(result.user.email).toBe(EMAIL);
	});

	it("throws invalid-credentials-error when the current password is wrong", async () => {
		const provider = createProvider();
		const { token } = await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});
		const headers = new Headers({ authorization: `Bearer ${token}` });

		let thrownError: unknown;
		try {
			await provider.changePassword(
				{ currentPassword: "wrong-password", newPassword: NEW_PASSWORD },
				headers,
			);
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(InvalidCredentialsError);
		if (thrownError instanceof InvalidCredentialsError) {
			expect(thrownError.code).toBe("INVALID_CREDENTIALS");
			expect(thrownError.statusCode).toBe(401);
		}
	});

	it("requests a password reset without throwing", async () => {
		const provider = createProvider();

		await expect(provider.requestPasswordReset(EMAIL)).resolves.toBeUndefined();
	});

	it("resets the password and allows sign in with the new password", async () => {
		const provider = createProvider();
		await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		await provider.requestPasswordReset(EMAIL);
		const token = await getResetToken(provider, EMAIL);

		await provider.resetPassword({ token, newPassword: NEW_PASSWORD });

		const result = await provider.signInWithPassword({
			email: EMAIL,
			password: NEW_PASSWORD,
		});
		expect(result.user.email).toBe(EMAIL);
	});

	it("throws invalid-reset-token-error for an unknown token", async () => {
		const provider = createProvider();

		let thrownError: unknown;
		try {
			await provider.resetPassword({
				token: "unknown-token",
				newPassword: NEW_PASSWORD,
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

	it("sends a verification email for an existing user", async () => {
		const provider = createProvider();
		await provider.signUpWithPassword({
			name: NAME,
			email: EMAIL,
			password: PASSWORD,
		});

		await provider.sendVerificationEmail(EMAIL);
		const token = await getVerificationToken(provider, EMAIL);

		expect(token).not.toBeNull();
	});

	it("does not throw when sending verification email to an unknown address", async () => {
		const provider = createProvider();

		await expect(
			provider.sendVerificationEmail("unknown@example.com"),
		).resolves.toBeUndefined();
	});

	describe("admin methods", () => {
		const ADMIN_EMAIL = "admin@example.com";
		const ADMIN_NAME = "Admin User";

		async function createAdminActor(provider: AuthProvider) {
			await provider.createUser(
				{
					email: ADMIN_EMAIL,
					name: ADMIN_NAME,
					password: PASSWORD,
					role: "moderator",
				},
				new Headers(),
			);
			const session = await provider.signInWithPassword({
				email: ADMIN_EMAIL,
				password: PASSWORD,
			});
			const token = session.token;
			if (!token) throw new Error("expected a session token");
			return { token };
		}

		function adminHeaders(token: string) {
			return new Headers({ authorization: `Bearer ${token}` });
		}

		it("lists users with pagination", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			await provider.signUpWithPassword({
				name: "Alice",
				email: "alice@example.com",
				password: PASSWORD,
			});
			await provider.signUpWithPassword({
				name: "Bob",
				email: "bob@example.com",
				password: PASSWORD,
			});

			const page1 = await provider.listUsers(
				{ limit: 1, offset: 0, sortBy: "email", sortDirection: "asc" },
				headers,
			);
			const page2 = await provider.listUsers(
				{ limit: 1, offset: 1, sortBy: "email", sortDirection: "asc" },
				headers,
			);

			expect(page1.users).toHaveLength(1);
			expect(page2.users).toHaveLength(1);
			expect(page1.users[0].email).not.toBe(page2.users[0].email);
			expect(page1.total).toBeGreaterThanOrEqual(2);
		});

		it("searches users by email", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			await provider.signUpWithPassword({
				name: "Alice",
				email: "alice@example.com",
				password: PASSWORD,
			});
			await provider.signUpWithPassword({
				name: "Bob",
				email: "bob@example.com",
				password: PASSWORD,
			});

			const result = await provider.listUsers(
				{ searchValue: "alice@example.com", searchField: "email" },
				headers,
			);

			expect(result.users).toHaveLength(1);
			expect(result.users[0].email).toBe("alice@example.com");
		});

		it("gets a user by id", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			const found = await provider.getUser({ userId: user.id }, headers);

			expect(found.id).toBe(user.id);
			expect(found.email).toBe(EMAIL);
		});

		it("throws user-not-found-error when getting unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.getUser({ userId: "unknown-id" }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("creates a user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			const user = await provider.createUser(
				{
					email: "new@example.com",
					name: "New User",
					password: PASSWORD,
					role: "moderator",
				},
				headers,
			);

			expect(user.email).toBe("new@example.com");
			expect(user.role).toBe("moderator");
			expect(user.banned).toBe(false);

			const session = await provider.signInWithPassword({
				email: "new@example.com",
				password: PASSWORD,
			});
			expect(session.user.id).toBe(user.id);
		});

		it("throws user-already-exists-error on duplicate email when creating user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			await provider.createUser(
				{ email: "dup@example.com", name: "Dup", password: PASSWORD },
				headers,
			);

			await expect(
				provider.createUser(
					{ email: "dup@example.com", name: "Dup 2", password: PASSWORD },
					headers,
				),
			).rejects.toBeInstanceOf(UserAlreadyExistsError);
		});

		it("throws invalid-role-error when creating user with invalid role", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.createUser(
					{
						email: "bad@example.com",
						name: "Bad",
						password: PASSWORD,
						role: "",
					},
					headers,
				),
			).rejects.toBeInstanceOf(InvalidRoleError);
		});

		it("updates a user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			const updated = await provider.updateUser(
				{ userId: user.id, data: { name: "Updated Name" } },
				headers,
			);

			expect(updated.name).toBe("Updated Name");
			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
				user.updatedAt.getTime(),
			);
		});

		it("throws user-not-found-error when updating unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.updateUser(
					{ userId: "unknown", data: { name: "X" } },
					headers,
				),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("throws invalid-role-error when updating user with invalid role", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			await expect(
				provider.updateUser({ userId: user.id, data: { role: "" } }, headers),
			).rejects.toBeInstanceOf(InvalidRoleError);
		});

		it("sets a user's role", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			const updated = await provider.setRole(
				{ userId: user.id, role: "moderator" },
				headers,
			);

			expect(updated.role).toBe("moderator");
		});

		it("throws invalid-role-error when setting invalid role", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			await expect(
				provider.setRole({ userId: user.id, role: "" }, headers),
			).rejects.toBeInstanceOf(InvalidRoleError);
		});

		it("throws user-not-found-error when setting role for unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.setRole({ userId: "unknown", role: "moderator" }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("bans a user and clears their sessions", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			const banned = await provider.banUser(
				{ userId: user.id, banReason: "spam", banExpiresIn: 3600 },
				headers,
			);

			expect(banned.banned).toBe(true);
			expect(banned.banReason).toBe("spam");
			expect(banned.banExpires).not.toBeNull();
			expect(
				await provider.listUserSessions({ userId: user.id }, headers),
			).toHaveLength(0);
		});

		it("unbans a user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});
			await provider.banUser({ userId: user.id, banReason: "spam" }, headers);

			const unbanned = await provider.unbanUser({ userId: user.id }, headers);

			expect(unbanned.banned).toBe(false);
			expect(unbanned.banReason).toBeNull();
			expect(unbanned.banExpires).toBeNull();
		});

		it("throws user-not-found-error when banning unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.banUser({ userId: "unknown" }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("throws user-already-banned-error when banning an already banned user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});
			await provider.banUser({ userId: user.id }, headers);

			await expect(
				provider.banUser({ userId: user.id }, headers),
			).rejects.toBeInstanceOf(UserAlreadyBannedError);
		});

		it("throws user-not-banned-error when unbanning a non-banned user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			await expect(
				provider.unbanUser({ userId: user.id }, headers),
			).rejects.toBeInstanceOf(UserNotBannedError);
		});

		it("lists user sessions", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user, token: userToken } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			const sessions = await provider.listUserSessions(
				{ userId: user.id },
				headers,
			);

			expect(sessions).toHaveLength(1);
			expect(sessions[0].token).toBe(userToken);
		});

		it("throws user-not-found-error when listing sessions for unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.listUserSessions({ userId: "unknown" }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("revokes user sessions", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			await provider.revokeUserSessions({ userId: user.id }, headers);

			expect(
				await provider.listUserSessions({ userId: user.id }, headers),
			).toHaveLength(0);
		});

		it("throws user-not-found-error when revoking sessions for unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.revokeUserSessions({ userId: "unknown" }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("sets a user's password", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const user = await provider.createUser(
				{ email: "nopass@example.com", name: "No Pass" },
				headers,
			);

			await provider.setUserPassword(
				{ userId: user.id, newPassword: NEW_PASSWORD },
				headers,
			);

			const session = await provider.signInWithPassword({
				email: user.email,
				password: NEW_PASSWORD,
			});
			expect(session.user.id).toBe(user.id);
		});

		it("throws user-not-found-error when setting password for unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.setUserPassword(
					{ userId: "unknown", newPassword: NEW_PASSWORD },
					headers,
				),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});

		it("throws weak-password-error when setting a short password", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const user = await provider.createUser(
				{ email: "weak@example.com", name: "Weak" },
				headers,
			);

			await expect(
				provider.setUserPassword(
					{ userId: user.id, newPassword: SHORT_PASSWORD },
					headers,
				),
			).rejects.toBeInstanceOf(WeakPasswordError);
		});

		it("removes a user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);
			const { user } = await provider.signUpWithPassword({
				name: NAME,
				email: EMAIL,
				password: PASSWORD,
			});

			await provider.removeUser({ userId: user.id }, headers);

			await expect(
				provider.getUser({ userId: user.id }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
			await expect(
				provider.signInWithPassword({ email: EMAIL, password: PASSWORD }),
			).rejects.toBeInstanceOf(InvalidCredentialsError);
		});

		it("throws user-not-found-error when removing unknown user", async () => {
			const provider = createProvider();
			const { token } = await createAdminActor(provider);
			const headers = adminHeaders(token);

			await expect(
				provider.removeUser({ userId: "unknown" }, headers),
			).rejects.toBeInstanceOf(UserNotFoundError);
		});
	});
}

const apiByProvider = new WeakMap<AuthProvider, FakeAuthApi>();

describe("auth-provider-contract", () => {
	describe("in-memory-auth-provider", () => {
		describeAuthProviderContract({
			createProvider: () => new InMemoryAuthProvider(),
			getResetToken: (provider, email) => {
				const token = (provider as InMemoryAuthProvider).getPendingResetToken(
					email,
				);
				expect(token).not.toBeNull();
				if (token) return Promise.resolve(token);
				throw new Error("expected a pending reset token");
			},
			getVerificationToken: (provider, email) => {
				const token = (
					provider as InMemoryAuthProvider
				).getPendingVerificationToken(email);
				expect(token).not.toBeNull();
				if (token) return Promise.resolve(token);
				throw new Error("expected a pending verification token");
			},
		});
	});

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
			getVerificationToken: (provider, email) => {
				const api = apiByProvider.get(provider);
				const token = api?.getPendingVerificationToken(email) ?? null;
				expect(token).not.toBeNull();
				if (token) return Promise.resolve(token);
				throw new Error("expected a pending verification token");
			},
		});
	});
});
