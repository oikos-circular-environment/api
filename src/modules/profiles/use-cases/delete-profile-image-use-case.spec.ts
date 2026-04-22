import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { DeleteProfileImageUseCase } from "./delete-profile-image-use-case.js";

describe("delete-profile-image-use-case", () => {
	it("deletes profile image when it exists", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const profile = await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			email: "john@example.com",
			is_collector: false,
		});

		const filePath = "profiles/11111111-1111-1111-1111-111111111111.jpeg";

		await storageProvider.uploadFile(filePath, Buffer.from("image-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: "https://in-memory.storage/profiles/11111111-1111-1111-1111-111111111111.jpeg",
			file_name: "avatar.jpeg",
			path: filePath,
			base64: Buffer.from("image-content").toString("base64"),
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toBeUndefined();
		expect((await profilesRepository.findById(profile.id))?.profile_image).toBe(
			null,
		);
		expect(await storageProvider.checkFileExists(filePath)).toBe(false);
	});

	it("throws when profile does not have an image", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			email: "john@example.com",
			is_collector: false,
		});

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
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

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

	it("propagates internal error when delete operation fails", async () => {
		class DeleteProfileImageFailRepository extends InMemoryProfilesRepository {
			async deleteProfileImage() {
				throw new Error("Delete failed");
			}
		}

		const profilesRepository = new DeleteProfileImageFailRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new DeleteProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const profile = await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			email: "john@example.com",
			is_collector: false,
		});

		const filePath = "profiles/11111111-1111-1111-1111-111111111111.jpeg";

		await storageProvider.uploadFile(filePath, Buffer.from("image-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: "https://in-memory.storage/profiles/11111111-1111-1111-1111-111111111111.jpeg",
			file_name: "avatar.jpeg",
			path: filePath,
			base64: Buffer.from("image-content").toString("base64"),
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof Error).toBe(true);

		if (thrownError instanceof Error) {
			expect(thrownError.message).toBe("Delete failed");
		}
	});
});
