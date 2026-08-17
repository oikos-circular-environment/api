import { compare } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { UserAlreadyExistsError } from "@/modules/users/errors/user-already-exists-error.js";
import {
	makeUser,
	TEST_PASSWORD,
} from "@/modules/users/factories/make-user.js";
import { InMemoryUsersRepository } from "@/modules/users/repositories/in-memory/in-memory-users-repositories.js";
import { RegisterUserUseCase } from "./register-user-use-case.js";

describe("register-user-use-case", () => {
	it("registers a user with hashed password", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const sut = new RegisterUserUseCase(usersRepository);

		const input = makeUser();

		const result = await sut.execute(input);

		expect(result.email).toBe(input.email);
		expect(result.password).not.toBeNull();
		expect(result.password).not.toBe(TEST_PASSWORD);

		const passwordMatches = result.password
			? await compare(TEST_PASSWORD, result.password)
			: false;

		expect(passwordMatches).toBe(true);
	});

	it("throws when email already exists", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const sut = new RegisterUserUseCase(usersRepository);

		const input = makeUser();

		await sut.execute(input);

		let thrownError: unknown;

		try {
			await sut.execute(input);
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof UserAlreadyExistsError).toBe(true);

		if (thrownError instanceof UserAlreadyExistsError) {
			expect(thrownError.message).toBe("Email is already in use.");
			expect(thrownError.code).toBe("USER_ALREADY_EXISTS");
			expect(thrownError.statusCode).toBe(409);
		}

		expect(usersRepository.items.length).toBe(1);
	});
});
