import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryAddressesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { CreateProfileAddressUseCase } from "./create-profile-address-use-case.js";

describe("create-profile-address-use-case", () => {
  it("creates an address for an existing profile", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const addressesRepository = new InMemoryAddressesRepository();
    const sut = new CreateProfileAddressUseCase(profilesRepository, addressesRepository);

    const profile = await profilesRepository.create({
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
        zip_code: "01001000",
        street: "Rua A",
        number: "100",
        complement: "Casa",
        district: "Centro",
        city: "Sao Paulo",
        state: "Sao Paulo",
        state_code: "SP",
        latitude: -23.5,
        longitude: -46.6,
      },
    });

    expect(result.street).toBe("Rua A");
    expect(result.number).toBe("100");
    expect(result.zip_code).toBe("01001000");
    expect(result.city).toBe("Sao Paulo");
    expect(result.state_code).toBe("SP");
    expect(addressesRepository.items[0]?.profile_id).toBe(profile.id);
  });

  it("throws when profile does not exist", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const addressesRepository = new InMemoryAddressesRepository();
    const sut = new CreateProfileAddressUseCase(profilesRepository, addressesRepository);

    let thrownError: unknown;

    try {
      await sut.execute({
        userId: "11111111-1111-1111-1111-111111111111",
        data: {
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

  it("throws when address already exists for profile", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const addressesRepository = new InMemoryAddressesRepository();
    const sut = new CreateProfileAddressUseCase(profilesRepository, addressesRepository);

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

    let thrownError: unknown;

    try {
      await sut.execute({
        userId: "11111111-1111-1111-1111-111111111111",
        data: {
          zip_code: "01310000",
          street: "Rua B",
          number: "200",
          complement: null,
          district: "Bela Vista",
          city: "Sao Paulo",
          state: "Sao Paulo",
          state_code: "SP",
          latitude: null,
          longitude: null,
        },
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError instanceof AppError).toBe(true);

    if (thrownError instanceof AppError) {
      expect(thrownError.message).toBe("Address already exists");
      expect(thrownError.code).toBe("ADDRESS_ALREADY_EXISTS");
      expect(thrownError.statusCode).toBe(409);
    }

    expect(addressesRepository.items.length).toBe(1);
  });
});
