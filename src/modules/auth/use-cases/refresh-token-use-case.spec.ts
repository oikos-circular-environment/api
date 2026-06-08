import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/auth/errors/invalid-credentials-error.js";
import { makeUserCredentials } from "@/modules/auth/factories/make-user-credentials.js";
import { InMemoryAuthRepository } from "@/modules/auth/repositories/in-memory/in-memory-auth-repository.js";
import { RefreshTokenUseCase } from "./refresh-token-use-case.js";

describe("refresh-token-use-case", () => {
	it("returns user when userId is valid", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new RefreshTokenUseCase(authRepository);

		const credentials = makeUserCredentials();

		const createdUser = await authRepository.create({
			email: credentials.email,
			password: "hashed-password",
		});

		const result = await sut.execute({ userId: createdUser.id });

		expect(result).toStrictEqual({
			id: createdUser.id,
			email: credentials.email,
		});
	});

	it("throws InvalidCredentialsError when user does not exist", async () => {
		const authRepository = new InMemoryAuthRepository();
		const sut = new RefreshTokenUseCase(authRepository);

		let thrownError: unknown;

		try {
			await sut.execute({ userId: randomUUID() });
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
