import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryAddressesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { UpsertProfileUseCase } from "./upsert-profile-use-case.js";

describe("upsert-profile-use-case", () => {
	it("creates a profile when user does not have one", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

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
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

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
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

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
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

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
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

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

	it("creates address when profile is created with address data", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				full_name: "John Doe",
				display_name: "john",
				cpf: "12345678900",
				phone: "5511999999999",
				is_collector: false,
				address: {
					zip_code: "01001000",
					street: "Rua A",
					number: "100",
					complement: "Casa",
					district: "Centro",
					city_ibge_id: 3550308,
					city: "Sao Paulo",
					state_ibge_id: 35,
					state: "Sao Paulo",
					state_code: "SP",
					latitude: -23.5,
					longitude: -46.6,
				},
			},
		});

		expect(result.address).not.toBeNull();
		expect(result.address?.street).toBe("Rua A");
		expect(result.address?.zip_code).toBe("01001000");
		expect(result.address?.city).toBe("Sao Paulo");
		expect(result.address?.state_code).toBe("SP");
		expect(addressesRepository.items.length).toBe(1);
		expect(addressesRepository.items[0]?.profile_id).toBe(result.id);
	});

	it("creates address when existing profile has no address", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

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
				phone: "5511999999999",
				is_collector: false,
				address: {
					zip_code: "01001000",
					street: "Rua A",
					number: "100",
					complement: null,
					district: "Centro",
					city_ibge_id: 3550308,
					city: "Sao Paulo",
					state_ibge_id: 35,
					state: "Sao Paulo",
					state_code: "SP",
					latitude: null,
					longitude: null,
				},
			},
		});

		expect(result.address).not.toBeNull();
		expect(result.address?.street).toBe("Rua A");
		expect(addressesRepository.items.length).toBe(1);
		expect(profilesRepository.items.length).toBe(1);
	});

	it("updates existing address when profile already has one", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

		const profile = await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		await addressesRepository.create({
			profile_id: profile.id,
			zip_code: "01001000",
			street: "Rua A",
			number: "100",
			complement: null,
			district: "Centro",
			city_ibge_id: 3550308,
			city: "Sao Paulo",
			state_ibge_id: 35,
			state: "Sao Paulo",
			state_code: "SP",
			latitude: null,
			longitude: null,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				full_name: "John Doe",
				display_name: "john",
				cpf: "12345678900",
				phone: "5511999999999",
				is_collector: false,
				address: {
					zip_code: "01310000",
					street: "Rua B",
					number: "200",
					complement: "Apto 5",
					district: "Bela Vista",
					city_ibge_id: 3550308,
					city: "Sao Paulo",
					state_ibge_id: 35,
					state: "Sao Paulo",
					state_code: "SP",
					latitude: -23.6,
					longitude: -46.7,
				},
			},
		});

		expect(result.address?.street).toBe("Rua B");
		expect(result.address?.zip_code).toBe("01310000");
		expect(result.address?.number).toBe("200");
		expect(result.address?.complement).toBe("Apto 5");
		expect(addressesRepository.items.length).toBe(1);
	});

	it("does not affect existing address when no address data is provided", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertProfileUseCase(profilesRepository, addressesRepository);

		const profile = await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		await addressesRepository.create({
			profile_id: profile.id,
			zip_code: "01001000",
			street: "Rua A",
			number: "100",
			complement: null,
			district: "Centro",
			city_ibge_id: 3550308,
			city: "Sao Paulo",
			state_ibge_id: 35,
			state: "Sao Paulo",
			state_code: "SP",
			latitude: null,
			longitude: null,
		});

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				full_name: "John Updated",
				display_name: "john-updated",
				cpf: "12345678900",
				phone: "5511000000000",
				is_collector: false,
			},
		});

		expect(addressesRepository.items.length).toBe(1);
		expect(addressesRepository.items[0]?.street).toBe("Rua A");
	});
});
