import { expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InvalidResetTokenError } from "@/modules/auth/errors/invalid-reset-token-error.js";
import { UserAlreadyExistsError } from "@/modules/auth/errors/user-already-exists-error.js";
import { WeakPasswordError } from "@/modules/auth/errors/weak-password-error.js";
import type { AuthProvider } from "./auth-provider.js";

const NAME = "Ada Lovelace";
const EMAIL = "ada@example.com";
const PASSWORD = "Test@123456";
const NEW_PASSWORD = "NewPass@123";
const SHORT_PASSWORD = "123";

export type AuthProviderContractContext = {
	createProvider: () => AuthProvider;
	getResetToken: (provider: AuthProvider, email: string) => Promise<string>;
};

export function describeAuthProviderContract({
	createProvider,
	getResetToken,
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
}
