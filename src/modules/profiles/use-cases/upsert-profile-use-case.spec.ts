import { describe, expect, it } from "vitest";
import { InMemoryUsersRepository } from "@/modules/accounts/repositories/in-memory/in-memory-users-repositories.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryTransactionManager } from "@/modules/common/providers/transaction/in-memory/in-memory-transaction-manager.js";
import {
	makeAddress,
	makeProfileInput,
} from "@/modules/profiles/factories/make-profile.js";
import { InMemoryAddressesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { UpsertProfileUseCase } from "./upsert-profile-use-case.js";

function createUser(usersRepository: InMemoryUsersRepository, userId: string) {
	usersRepository.items.push({
		id: userId,
		email: "test@example.com",
		created_at: new Date(),
		deleted_at: null,
		deletion_job_id: null,
	});
}

describe("upsert-profile-use-case", () => {
	it("creates a profile when user does not have one", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		createUser(usersRepository, input.user_id);

		const result = await sut.execute({
			userId: input.user_id,
			data: {
				full_name: input.full_name,
				display_name: input.display_name,
				phone: input.phone,
			},
		});

		expect(result.user_id).toBe(input.user_id);
		expect(result.full_name).toBe(input.full_name);
		expect(result.id.length > 0).toBe(true);
		expect(profilesRepository.items.length).toBe(1);
	});

	it("updates an existing profile when user already has one", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const initial = makeProfileInput();

		createUser(usersRepository, initial.user_id);
		await profilesRepository.create(initial);

		const updated = makeProfileInput({ user_id: initial.user_id });

		const result = await sut.execute({
			userId: initial.user_id,
			data: {
				full_name: updated.full_name,
				display_name: updated.display_name,
				phone: updated.phone,
			},
		});

		expect(result.full_name).toBe(updated.full_name);
		expect(result.display_name).toBe(updated.display_name);
		expect(result.phone).toBe(updated.phone);
		expect(profilesRepository.items.length).toBe(1);
	});

	it("creates address when profile is created with address data", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();
		const address = makeAddress({
			street: "Rua A",
			zip_code: "01001000",
			city: "Sao Paulo",
			state_code: "SP",
		});

		createUser(usersRepository, input.user_id);

		const result = await sut.execute({
			userId: input.user_id,
			data: {
				full_name: input.full_name,
				display_name: input.display_name,
				phone: input.phone,
				address,
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
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		createUser(usersRepository, input.user_id);
		await profilesRepository.create(input);

		const address = makeAddress({
			street: "Rua A",
			complement: null,
		});

		const result = await sut.execute({
			userId: input.user_id,
			data: {
				full_name: input.full_name,
				display_name: input.display_name,
				phone: input.phone,
				address,
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
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		createUser(usersRepository, input.user_id);
		const profile = await profilesRepository.create(input);

		const initialAddress = makeAddress({ complement: null });

		await addressesRepository.create({
			profile_id: profile.id,
			...initialAddress,
		});

		const result = await sut.execute({
			userId: input.user_id,
			data: {
				full_name: input.full_name,
				display_name: input.display_name,
				phone: input.phone,
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

	it("throws when user does not exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: input.user_id,
				data: {
					full_name: input.full_name,
					display_name: input.display_name,
					phone: input.phone,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("User not found");
			expect(thrownError.code).toBe("USER_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("does not affect existing address when no address data is provided", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		createUser(usersRepository, input.user_id);
		const profile = await profilesRepository.create(input);

		const existingAddress = makeAddress({
			street: "Rua A",
			complement: null,
		});

		await addressesRepository.create({
			profile_id: profile.id,
			...existingAddress,
		});

		const updated = makeProfileInput({ user_id: input.user_id });

		await sut.execute({
			userId: input.user_id,
			data: {
				full_name: updated.full_name,
				display_name: updated.display_name,
				phone: updated.phone,
			},
		});

		expect(addressesRepository.items.length).toBe(1);
		expect(addressesRepository.items[0]?.street).toBe("Rua A");
	});

	it("syncs User.name with full_name when profile is created", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		createUser(usersRepository, input.user_id);

		await sut.execute({
			userId: input.user_id,
			data: {
				full_name: input.full_name,
				display_name: input.display_name,
				phone: input.phone,
			},
		});

		const user = await usersRepository.findById(input.user_id);
		expect(user?.name).toBe(input.full_name);
	});

	it("syncs User.name with full_name when profile is updated", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new UpsertProfileUseCase(
			profilesRepository,
			addressesRepository,
			usersRepository,
			transactionManager,
		);

		const initial = makeProfileInput();

		createUser(usersRepository, initial.user_id);
		await profilesRepository.create(initial);

		const updated = makeProfileInput({ user_id: initial.user_id });

		await sut.execute({
			userId: initial.user_id,
			data: {
				full_name: updated.full_name,
				display_name: updated.display_name,
				phone: updated.phone,
			},
		});

		const user = await usersRepository.findById(initial.user_id);
		expect(user?.name).toBe(updated.full_name);
	});
});
