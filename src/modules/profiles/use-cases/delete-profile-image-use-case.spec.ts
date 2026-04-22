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

		expect(result.profile_image).toBe(null);
		expect(await storageProvider.checkFileExists(filePath)).toBe(false);
	});

	it("returns profile unchanged when image does not exist", async () => {
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

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result.id).toBe(profile.id);
		expect(result.profile_image).toBe(null);
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

	it("throws when delete image returns null", async () => {
		class DeleteProfileImageFailRepository extends InMemoryProfilesRepository {
			async deleteProfileImage() {
				return null;
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

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Profile not found");
			expect(thrownError.code).toBe("PROFILE_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
