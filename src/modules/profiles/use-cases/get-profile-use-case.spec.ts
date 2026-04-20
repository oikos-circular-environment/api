import { describe, expect, it } from "vitest";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { GetProfileUseCase } from "./get-profile-use-case.js";

describe("get-profile-use-case", () => {
  it("returns profile when it exists", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const sut = new GetProfileUseCase(profilesRepository);

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

    expect(result?.user_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(result?.email).toBe("john@example.com");
    expect(result?.full_name).toBe("John Doe");
  });

  it("returns null when profile does not exist", async () => {
    const profilesRepository = new InMemoryProfilesRepository();
    const sut = new GetProfileUseCase(profilesRepository);

    const result = await sut.execute({
      userId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result).toBe(null);
  });
});
