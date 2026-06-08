import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import {
	makeAddress,
	makeProfileInput,
} from "@/modules/profiles/factories/make-profile.js";
import { InMemoryAddressesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { GetProfileAddressUseCase } from "./get-profile-address-use-case.js";

describe("get-profile-address-use-case", () => {
	it("returns address when profile and address exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetProfileAddressUseCase(
			profilesRepository,
			addressesRepository,
		);

		const profileInput = makeProfileInput();
		const profile = await profilesRepository.create(profileInput);

		const addressInput = makeAddress({
			street: "Rua A",
			city: "Sao Paulo",
			state_code: "SP",
		});

		await addressesRepository.create({
			profile_id: profile.id,
			...addressInput,
		});

		const result = await sut.execute({ userId: profileInput.user_id });

		expect(result?.street).toBe("Rua A");
		expect(result?.city).toBe("Sao Paulo");
		expect(result?.state_code).toBe("SP");
	});

	it("returns null when profile exists but has no address", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetProfileAddressUseCase(
			profilesRepository,
			addressesRepository,
		);

		const profileInput = makeProfileInput();

		await profilesRepository.create(profileInput);

		const result = await sut.execute({ userId: profileInput.user_id });

		expect(result).toBe(null);
	});

	it("throws when profile does not exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetProfileAddressUseCase(
			profilesRepository,
			addressesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({ userId: randomUUID() });
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
