import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { InMemoryProfilesRepository } from "@/modules/profiles/repositories/in-memory/in-memory-profiles-repositories.js";
import { UpsertProfileImageUseCase } from "./upsert-profile-image-use-case.js";

describe("upsert-profile-image-use-case", () => {
	it("creates a profile image using jpeg file", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		const imageContent = Buffer.from("jpeg-image-content");

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			file: {
				fileName: "avatar.jpeg",
				mimeType: "image/jpeg",
				content: imageContent,
			},
		});

		expect(result.path).toBe(
			"profiles/11111111-1111-1111-1111-111111111111.jpeg",
		);
		expect(result.file_name).toBe("avatar.jpeg");
		expect(result.base64).toBe(imageContent.toString("base64"));
		expect(
			await storageProvider.checkFileExists(
				"profiles/11111111-1111-1111-1111-111111111111.jpeg",
			),
		).toBe(true);
	});

	it("deletes old file and uploads new one when extension changes", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const profile = await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		const oldImagePath = "profiles/11111111-1111-1111-1111-111111111111.jpeg";

		await storageProvider.uploadFile(oldImagePath, Buffer.from("old-image"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: "https://in-memory.storage/profiles/11111111-1111-1111-1111-111111111111.jpeg",
			file_name: "avatar.jpeg",
			path: oldImagePath,
			base64: Buffer.from("old-image").toString("base64"),
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			file: {
				fileName: "avatar.png",
				mimeType: "image/png",
				content: Buffer.from("png-image-content"),
			},
		});

		expect(result.path).toBe(
			"profiles/11111111-1111-1111-1111-111111111111.png",
		);
		expect(await storageProvider.checkFileExists(oldImagePath)).toBe(false);
		expect(
			await storageProvider.checkFileExists(
				"profiles/11111111-1111-1111-1111-111111111111.png",
			),
		).toBe(true);
	});

	it("deletes old file and uploads new one when same extension", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const profile = await profilesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			full_name: "John Doe",
			display_name: "john",
			cpf: "12345678900",
			phone: "5511999999999",
			is_collector: false,
		});

		const imagePath = "profiles/11111111-1111-1111-1111-111111111111.jpeg";

		await storageProvider.uploadFile(imagePath, Buffer.from("old-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: "https://in-memory.storage/profiles/11111111-1111-1111-1111-111111111111.jpeg",
			file_name: "avatar.jpeg",
			path: imagePath,
			base64: Buffer.from("old-content").toString("base64"),
		});

		const newContent = Buffer.from("new-content");

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			file: {
				fileName: "new-avatar.jpeg",
				mimeType: "image/jpeg",
				content: newContent,
			},
		});

		expect(result.file_name).toBe("new-avatar.jpeg");
		expect(result.base64).toBe(newContent.toString("base64"));
	});

	it("throws when profile does not exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				file: {
					fileName: "avatar.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
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

	it("throws when image type is invalid", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

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
				userId: "11111111-1111-1111-1111-111111111111",
				file: {
					fileName: "avatar.gif",
					mimeType: "image/gif",
					content: Buffer.from("gif-image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Profile image type is invalid. Allowed types: jpeg and png",
			);
			expect(thrownError.code).toBe("PROFILE_IMAGE_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when image exceeds 10MB", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

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
				userId: "11111111-1111-1111-1111-111111111111",
				file: {
					fileName: "avatar.png",
					mimeType: "image/png",
					content: Buffer.alloc(10 * 1024 * 1024 + 1),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Profile image exceeds the maximum size of 10MB",
			);
			expect(thrownError.code).toBe("PROFILE_IMAGE_TOO_LARGE");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when upload fails", async () => {
		const profilesRepository = new InMemoryProfilesRepository();

		class UploadFailStorageProvider implements StorageProvider {
			async uploadFile() {
				return null;
			}

			async deleteFile() {}

			async getFileUrl() {
				return { url: "https://in-memory.storage/profiles/fallback.jpeg" };
			}

			async checkFileExists() {
				return false;
			}

			async convertFileToBase64() {
				return "";
			}
		}

		const storageProvider = new UploadFailStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

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
				userId: "11111111-1111-1111-1111-111111111111",
				file: {
					fileName: "avatar.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Failed to upload profile image");
			expect(thrownError.code).toBe("PROFILE_IMAGE_UPLOAD_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}
	});

	it("throws when image save returns null", async () => {
		class SaveProfileImageFailRepository extends InMemoryProfilesRepository {
			async saveProfileImage() {
				return null;
			}
		}

		const profilesRepository = new SaveProfileImageFailRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

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
				userId: "11111111-1111-1111-1111-111111111111",
				file: {
					fileName: "avatar.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
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
});
