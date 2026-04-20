import { hash } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { InvalidCredentialsError } from "@/modules/users/errors/invalid-credentials-error.js";
import { InMemoryUsersRepository } from "@/modules/users/repositories/in-memory/in-memory-users-repositories.js";
import { AuthenticateUserUseCase } from "./authenticate-user-use-case.js";

describe("authenticate-user-use-case", () => {
  it("returns user when credentials are valid", async () => {
    const usersRepository = new InMemoryUsersRepository();
    const sut = new AuthenticateUserUseCase(usersRepository);

    const passwordHash = await hash("123456", 6);

    const createdUser = await usersRepository.create({
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
    const usersRepository = new InMemoryUsersRepository();
    const sut = new AuthenticateUserUseCase(usersRepository);

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
    const usersRepository = new InMemoryUsersRepository();
    const sut = new AuthenticateUserUseCase(usersRepository);

    const passwordHash = await hash("123456", 6);

    await usersRepository.create({
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
