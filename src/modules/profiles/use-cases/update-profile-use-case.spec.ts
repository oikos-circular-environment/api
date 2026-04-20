import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { UpdateProfileUseCase } from "./update-profile-use-case.js";

describe("update-profile-use-case", () => {
  it("updates an existing profile", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const sut = new UpdateProfileUseCase(profilesRepository);

    await profilesRepository.create({
      user_id: "11111111-1111-1111-1111-111111111111",
      full_name: "John Doe",
      display_name: "john",
      cpf: "12345678900",
      phone: "5511999999999",
      email: "john@example.com",
      is_collector: false,
    });

    const result = await sut.execute({
      userId: "11111111-1111-1111-1111-111111111111",
      data: {
        full_name: "John Updated",
        display_name: "john-updated",
        phone: "5511777777777",
        is_collector: true,
      },
    });

    expect(result?.full_name).toBe("John Updated");
    expect(result?.display_name).toBe("john-updated");
    expect(result?.phone).toBe("5511777777777");
    expect(result?.is_collector).toBe(true);
    expect(result?.email).toBe("john@example.com");
  });

  it("throws when profile does not exist", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const sut = new UpdateProfileUseCase(profilesRepository);

    let thrownError: unknown;

    try {
      await sut.execute({
        userId: "11111111-1111-1111-1111-111111111111",
        data: {
          full_name: "John Updated",
        },
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError instanceof AppError).toBe(true);

    if (thrownError instanceof AppError) {
      expect(thrownError.message).toBe("Profile not found");
      expect(thrownError.code).toBe("PROFILE_NOT_FOUND");
      expect(thrownError.statusCode).toBe(404);
    }
  });
});
