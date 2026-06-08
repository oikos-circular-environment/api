import { hash } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { makeUserCredentials, TEST_PASSWORD } from "@/modules/auth/factories/make-user-credentials.js";
import { InMemoryAuthRepository } from "@/modules/auth/repositories/in-memory/in-memory-auth-repository.js";
import { AuthenticateUserUseCase } from "./authenticate-user-use-case.js";

describe("authenticate-user-use-case", () => {
	it("returns user when credentials are valid", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new AuthenticateUserUseCase(authRepository);

		const credentials = makeUserCredentials();
		const passwordHash = await hash(TEST_PASSWORD, 6);

		const createdUser = await authRepository.create({
			email: credentials.email,
			password: passwordHash,
		});

		const result = await sut.execute({
			email: credentials.email,
			password: TEST_PASSWORD,
		});

		expect(result).toStrictEqual({
			id: createdUser.id,
			email: credentials.email,
		});
	});

	it("throws when user does not exist", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new AuthenticateUserUseCase(authRepository);

		const credentials = makeUserCredentials();

		let thrownError: unknown;

		try {
			await sut.execute({
				email: credentials.email,
				password: TEST_PASSWORD,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof InvalidCredentialsError).toBe(true);

		if (thrownError instanceof InvalidCredentialsError) {
			expect(thrownError.message).toBe("Invalid credentials");
			expect(thrownError.code).toBe("INVALID_CREDENTIALS");
			expect(thrownError.statusCode).toBe(401);
		}
	});

	it("throws when password is invalid", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new AuthenticateUserUseCase(authRepository);

		const credentials = makeUserCredentials();
		const passwordHash = await hash(TEST_PASSWORD, 6);

		await authRepository.create({
			email: credentials.email,
			password: passwordHash,
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				email: credentials.email,
				password: "wrong-password",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof InvalidCredentialsError).toBe(true);

		if (thrownError instanceof InvalidCredentialsError) {
			expect(thrownError.message).toBe("Invalid credentials");
			expect(thrownError.code).toBe("INVALID_CREDENTIALS");
			expect(thrownError.statusCode).toBe(401);
		}
	});
});
