import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryAddressesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { GetProfileAddressUseCase } from "./get-profile-address-use-case.js";

describe("get-profile-address-use-case", () => {
  it("returns address when profile and address exist", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const addressesRepository = new InMemoryAddressesRepository();
    const sut = new GetProfileAddressUseCase(profilesRepository, addressesRepository);

    const profile = await profilesRepository.create({
      user_id: "11111111-1111-1111-1111-111111111111",
      full_name: "John Doe",
      display_name: "john",
      cpf: "12345678900",
      phone: "5511999999999",
      email: "john@example.com",
      is_collector: false,
    });

    await addressesRepository.create({
      profile_id: profile.id,
      zip_code: "01001000",
      street: "Rua A",
      number: "100",
      complement: null,
      district: "Centro",
      city: "Sao Paulo",
      state: "Sao Paulo",
      state_code: "SP",
      latitude: null,
      longitude: null,
    });

    const result = await sut.execute({
      userId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result?.street).toBe("Rua A");
    expect(result?.city).toBe("Sao Paulo");
    expect(result?.state_code).toBe("SP");
  });

  it("returns null when profile exists but has no address", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const addressesRepository = new InMemoryAddressesRepository();
    const sut = new GetProfileAddressUseCase(profilesRepository, addressesRepository);

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
    });

    expect(result).toBe(null);
  });

  it("throws when profile does not exist", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const addressesRepository = new InMemoryAddressesRepository();
    const sut = new GetProfileAddressUseCase(profilesRepository, addressesRepository);

    let thrownError: unknown;

    try {
      await sut.execute({
        userId: "11111111-1111-1111-1111-111111111111",
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
