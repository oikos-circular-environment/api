import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InMemoryAuthProvider } from "@/modules/auth/providers/auth/in-memory/in-memory-auth-provider.js";
import { ChangePasswordUseCase } from "./change-password-use-case.js";

const EMAIL = "ada@example.com";
const PASSWORD = "Test@123456";
const NEW_PASSWORD = "NewPass@123456";

describe("change-password-use-case", () => {
	it("changes the password and keeps the current session valid", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new ChangePasswordUseCase(provider);
		const { token } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: EMAIL,
			password: PASSWORD,
		});
		const headers = new Headers({ authorization: `Bearer ${token}` });

		await sut.execute(
			{ currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
			headers,
		);

		const session = await provider.getSession(headers);
		expect(session).not.toBeNull();
		expect(session?.user.email).toBe(EMAIL);
		await expect(
			provider.signInWithPassword({ email: EMAIL, password: NEW_PASSWORD }),
		).resolves.toBeDefined();
		await expect(
			provider.signInWithPassword({ email: EMAIL, password: PASSWORD }),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("throws invalid-credentials-error when the current password is wrong", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new ChangePasswordUseCase(provider);
		const { token } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: EMAIL,
			password: PASSWORD,
		});
		const headers = new Headers({ authorization: `Bearer ${token}` });

		await expect(
			sut.execute(
				{ currentPassword: "wrong-password", newPassword: NEW_PASSWORD },
				headers,
			),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});

	it("keeps other active sessions valid after the password change", async () => {
		const provider = new InMemoryAuthProvider();
		const sut = new ChangePasswordUseCase(provider);
		const { token: currentToken } = await provider.signUpWithPassword({
			name: "Ada Lovelace",
			email: EMAIL,
			password: PASSWORD,
		});
		const { token: otherToken } = await provider.signInWithPassword({
			email: EMAIL,
			password: PASSWORD,
		});
		const currentHeaders = new Headers({
			authorization: `Bearer ${currentToken}`,
		});
		const otherHeaders = new Headers({ authorization: `Bearer ${otherToken}` });

		await sut.execute(
			{ currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
			currentHeaders,
		);

		const otherSession = await provider.getSession(otherHeaders);
		expect(otherSession).not.toBeNull();
		expect(otherSession?.user.email).toBe(EMAIL);
	});
});
