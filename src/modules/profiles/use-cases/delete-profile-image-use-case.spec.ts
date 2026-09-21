import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryUsersRepository } from "@/modules/accounts/repositories/in-memory/in-memory-users-repositories.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import { InMemoryTransactionManager } from "@/modules/common/providers/transaction/in-memory/in-memory-transaction-manager.js";
import { makeProfileInput } from "@/modules/profiles/factories/make-profile.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { DeleteProfileImageUseCase } from "./delete-profile-image-use-case.js";

describe("delete-profile-image-use-case", () => {
	it("deletes profile image when it exists", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();
		const profile = await profilesRepository.create(input);

		const filePath = `profiles/${input.user_id}.jpeg`;

		await storageProvider.uploadFile(filePath, Buffer.from("image-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: `https://in-memory.storage/${filePath}`,
			file_name: "avatar.jpeg",
			path: filePath,
		});

		const result = await sut.execute({ userId: input.user_id });

		expect(result).toBeUndefined();
		expect((await profilesRepository.findById(profile.id))?.profile_image).toBe(
			null,
		);
		expect(await storageProvider.checkFileExists(filePath)).toBe(false);
	});

	it("throws when profile does not have an image", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();

		await profilesRepository.create(input);

		let thrownError: unknown;

		try {
			await sut.execute({ userId: input.user_id });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Profile does not have an image to delete",
			);
			expect(thrownError.code).toBe("PROFILE_IMAGE_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws when profile does not exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
			usersRepository,
			transactionManager,
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

	it("propagates internal error when delete operation fails", async () => {
		class DeleteProfileImageFailRepository extends InMemoryProfilesRepository {
			async deleteProfileImage() {
				throw new Error("Delete failed");
			}
		}

		const profilesRepository = new DeleteProfileImageFailRepository();
		const storageProvider = new InMemoryStorageProvider();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();
		const profile = await profilesRepository.create(input);

		const filePath = `profiles/${input.user_id}.jpeg`;

		await storageProvider.uploadFile(filePath, Buffer.from("image-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: `https://in-memory.storage/${filePath}`,
			file_name: "avatar.jpeg",
			path: filePath,
		});

		let thrownError: unknown;

		try {
			await sut.execute({ userId: input.user_id });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof Error).toBe(true);

		if (thrownError instanceof Error) {
			expect(thrownError.message).toBe("Delete failed");
		}
	});

	it("clears User.image when the profile image is deleted", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const usersRepository = new InMemoryUsersRepository();
		const transactionManager = new InMemoryTransactionManager();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
			usersRepository,
			transactionManager,
		);

		const input = makeProfileInput();
		const profile = await profilesRepository.create(input);
		usersRepository.items.push({
			id: input.user_id,
			email: "test@example.com",
			image: "https://in-memory.storage/profiles/old.jpeg",
			created_at: new Date(),
			deleted_at: null,
			deletion_job_id: null,
		});

		const filePath = `profiles/${input.user_id}.jpeg`;

		await storageProvider.uploadFile(filePath, Buffer.from("image-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: `https://in-memory.storage/${filePath}`,
			file_name: "avatar.jpeg",
			path: filePath,
		});

		await sut.execute({ userId: input.user_id });

		const user = await usersRepository.findById(input.user_id);
		expect(user?.image).toBeNull();
	});
});
