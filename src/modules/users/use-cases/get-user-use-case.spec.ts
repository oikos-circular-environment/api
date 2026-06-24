import { describe, expect, it } from "vitest";
import { UserNotFoundError } from "@/modules/users/errors/user-not-found-error.js";
import { makeUser } from "@/modules/users/factories/make-user.js";
import { InMemoryUsersRepository } from "@/modules/users/repositories/in-memory/in-memory-users-repositories.js";
import { GetUserUseCase } from "./get-user-use-case.js";

describe("get-user-use-case", () => {
	it("returns user by id", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const sut = new GetUserUseCase(usersRepository);

		const user = makeUser();
		usersRepository.items.push(user);

		const result = await sut.execute({ userId: user.id });

		expect(result.id).toBe(user.id);
		expect(result.email).toBe(user.email);
	});

	it("throws USER_NOT_FOUND when user does not exist", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const sut = new GetUserUseCase(usersRepository);

		await expect(
			sut.execute({ userId: "non-existent-id" }),
		).rejects.toBeInstanceOf(UserNotFoundError);
	});
});
