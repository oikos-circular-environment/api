import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { CreateProfileUseCase } from "./create-profile-use-case.js";

describe("create-profile-use-case", () => {
  it("creates a profile when user does not have one", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const sut = new CreateProfileUseCase(profilesRepository);

    const result = await sut.execute({
      userId: "11111111-1111-1111-1111-111111111111",
      data: {
        full_name: "John Doe",
        display_name: "john",
        cpf: "12345678900",
        phone: "5511999999999",
        email: "john@example.com",
        is_collector: true,
      },
    });

    expect(result.user_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.full_name).toBe("John Doe");
    expect(result.display_name).toBe("john");
    expect(result.cpf).toBe("12345678900");
    expect(result.phone).toBe("5511999999999");
    expect(result.email).toBe("john@example.com");
    expect(result.is_collector).toBe(true);
    expect(result.id.length > 0).toBe(true);
  });

  it("throws when profile already exists for user", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const sut = new CreateProfileUseCase(profilesRepository);

    await profilesRepository.create({
      user_id: "11111111-1111-1111-1111-111111111111",
      full_name: "John Doe",
      display_name: "john",
      cpf: "12345678900",
      phone: "5511999999999",
      email: "john@example.com",
      is_collector: false,
    });

    let thrownError: unknown;

    try {
      await sut.execute({
        userId: "11111111-1111-1111-1111-111111111111",
        data: {
          full_name: "Jane Doe",
          display_name: "jane",
          cpf: "00987654321",
          phone: "5511888888888",
          email: "jane@example.com",
          is_collector: true,
        },
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError instanceof AppError).toBe(true);

    if (thrownError instanceof AppError) {
      expect(thrownError.message).toBe("Profile already exists");
      expect(thrownError.code).toBe("PROFILE_ALREADY_EXISTS");
      expect(thrownError.statusCode).toBe(409);
    }

    expect(profilesRepository.items.length).toBe(1);
  });
});
