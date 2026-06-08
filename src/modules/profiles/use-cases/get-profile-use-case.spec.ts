import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeProfileInput } from "@/modules/profiles/factories/make-profile.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { GetProfileUseCase } from "./get-profile-use-case.js";

describe("get-profile-use-case", () => {
	it("returns profile when it exists", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new GetProfileUseCase(profilesRepository);

		const input = makeProfileInput();

		await profilesRepository.create(input);

		const result = await sut.execute({ userId: input.user_id });

		expect(result?.user_id).toBe(input.user_id);
		expect(result?.full_name).toBe(input.full_name);
	});

	it("returns null when profile does not exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new GetProfileUseCase(profilesRepository);

		const result = await sut.execute({ userId: randomUUID() });

		expect(result).toBe(null);
	});
});
