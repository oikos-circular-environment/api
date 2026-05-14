import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { UpsertProfileUseCase } from "./upsert-profile-use-case.js";

describe("upsert-profile-use-case", () => {
	it("creates a profile when user does not have one", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				full_name: "John Doe",
				display_name: "john",
				cpf: "12345678900",
				phone: "5511999999999",
				is_collector: false,
			},
		});

		expect(result.user_id).toBe("11111111-1111-1111-1111-111111111111");
		expect(result.full_name).toBe("John Doe");
		expect(result.cpf).toBe("12345678900");
		expect(result.id.length > 0).toBe(true);
		expect(profilesRepository.items.length).toBe(1);
	});

	it("updates an existing profile when user already has one", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository);

		await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				full_name: "John Updated",
				display_name: "john-updated",
				cpf: "12345678900",
				phone: "5511777777777",
				is_collector: true,
			},
		});

		expect(result.full_name).toBe("John Updated");
		expect(result.display_name).toBe("john-updated");
		expect(result.phone).toBe("5511777777777");
		expect(result.is_collector).toBe(true);
		expect(profilesRepository.items.length).toBe(1);
	});

	it("throws when CPF belongs to another user (no existing profile)", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository);

		await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "22222222-2222-2222-2222-222222222222",
				data: {
					full_name: "Jane Doe",
					display_name: "jane",
					cpf: "12345678900",
					phone: "5511888888888",
					is_collector: false,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("CPF already in use");
			expect(thrownError.code).toBe("CPF_ALREADY_IN_USE");
			expect(thrownError.statusCode).toBe(409);
		}

		expect(profilesRepository.items.length).toBe(1);
	});

	it("throws when CPF belongs to another user (with existing profile)", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository);

		await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		await profilesRepository.create({
			user_id: "22222222-2222-2222-2222-222222222222",
			full_name: "Jane Doe",
			display_name: "jane",
			cpf: "99988877766",
			phone: "5511888888888",
			is_collector: false,
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "22222222-2222-2222-2222-222222222222",
				data: {
					full_name: "Jane Updated",
					display_name: "jane-updated",
					cpf: "12345678900",
					phone: "5511888888888",
					is_collector: false,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("CPF already in use");
			expect(thrownError.code).toBe("CPF_ALREADY_IN_USE");
			expect(thrownError.statusCode).toBe(409);
		}
	});

	it("allows keeping same CPF when updating own profile", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository);

		await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				full_name: "John Doe",
				display_name: "john",
				cpf: "12345678900",
				phone: "5511000000000",
				is_collector: false,
			},
		});

		expect(result.cpf).toBe("12345678900");
		expect(result.phone).toBe("5511000000000");
	});
});
