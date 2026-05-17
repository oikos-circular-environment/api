import { hash } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { InMemoryAuthRepository } from "@/modules/auth/repositories/in-memory/in-memory-auth-repository.js";
import { AuthenticateUserUseCase } from "./authenticate-user-use-case.js";

describe("authenticate-user-use-case", () => {
	it("returns user when credentials are valid", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new AuthenticateUserUseCase(authRepository);

		const passwordHash = await hash("123456", 6);

		const createdUser = await authRepository.create({
			email: "john@example.com",
			password: passwordHash,
		});

		const result = await sut.execute({
			email: "john@example.com",
			password: "123456",
		});

		expect(result).toStrictEqual({
			id: createdUser.id,
			email: "john@example.com",
		});
	});

	it("throws when user does not exist", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new AuthenticateUserUseCase(authRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				email: "john@example.com",
				password: "123456",
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

		const passwordHash = await hash("123456", 6);

		await authRepository.create({
			email: "john@example.com",
			password: passwordHash,
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				email: "john@example.com",
				password: "654321",
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
