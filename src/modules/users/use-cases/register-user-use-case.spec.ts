import { compare } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { UserAlreadyExistsError } from "@/modules/users/errors/user-already-exists-error.js";
import { InMemoryUsersRepository } from "@/modules/users/repositories/in-memory/in-memory-users-repositories.js";
import { RegisterUserUseCase } from "./register-user-use-case.js";

describe("register-user-use-case", () => {
  it("registers a user with hashed password", async () => {
    const usersRepository = new InMemoryUsersRepository();
    const sut = new RegisterUserUseCase(usersRepository);

    const result = await sut.execute({
      email: "john@example.com",
      password: "123456",
    });

    expect(result.email).toBe("john@example.com");
    expect(result.password).not.toBe("123456");

    const passwordMatches = await compare("123456", result.password);

    expect(passwordMatches).toBe(true);
  });

  it("throws when email already exists", async () => {
    const usersRepository = new InMemoryUsersRepository();
    const sut = new RegisterUserUseCase(usersRepository);

    await sut.execute({
      email: "john@example.com",
      password: "123456",
    });

    let thrownError: unknown;

    try {
      await sut.execute({
        email: "john@example.com",
        password: "123456",
      });
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
