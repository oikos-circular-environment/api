import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { makeProfileInput } from "@/modules/profiles/factories/make-profile.js";
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

		const input = makeProfileInput();

		await profilesRepository.create(input);

		const imageContent = Buffer.from("jpeg-image-content");

		const result = await sut.execute({
			userId: input.user_id,
			file: {
				fileName: "avatar.jpeg",
				mimeType: "image/jpeg",
				content: imageContent,
			},
		});

		const expectedPath = `profiles/${input.user_id}.jpeg`;

		expect(result.path).toBe(expectedPath);
		expect(result.file_name).toBe("avatar.jpeg");
		expect(await storageProvider.checkFileExists(expectedPath)).toBe(true);
	});

	it("deletes old file and uploads new one when extension changes", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const input = makeProfileInput();
		const profile = await profilesRepository.create(input);

		const oldImagePath = `profiles/${input.user_id}.jpeg`;

		await storageProvider.uploadFile(oldImagePath, Buffer.from("old-image"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: `https://in-memory.storage/${oldImagePath}`,
			file_name: "avatar.jpeg",
			path: oldImagePath,
		});

		const result = await sut.execute({
			userId: input.user_id,
			file: {
				fileName: "avatar.png",
				mimeType: "image/png",
				content: Buffer.from("png-image-content"),
			},
		});

		const newPath = `profiles/${input.user_id}.png`;

		expect(result.path).toBe(newPath);
		expect(await storageProvider.checkFileExists(oldImagePath)).toBe(false);
		expect(await storageProvider.checkFileExists(newPath)).toBe(true);
	});

	it("deletes old file and uploads new one when same extension", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const input = makeProfileInput();
		const profile = await profilesRepository.create(input);

		const imagePath = `profiles/${input.user_id}.jpeg`;

		await storageProvider.uploadFile(imagePath, Buffer.from("old-content"));
		await profilesRepository.saveProfileImage(profile.id, {
			url: `https://in-memory.storage/${imagePath}`,
			file_name: "avatar.jpeg",
			path: imagePath,
		});

		const newContent = Buffer.from("new-content");

		const result = await sut.execute({
			userId: input.user_id,
			file: {
				fileName: "new-avatar.jpeg",
				mimeType: "image/jpeg",
				content: newContent,
			},
		});

		expect(result.file_name).toBe("new-avatar.jpeg");
	});

	it("throws when profile does not exist", async () => {
		const profilesRepository = new InMemoryProfilesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UpsertProfileImageUseCase(
			profilesRepository,
			storageProvider,
		);

		const input = makeProfileInput();

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: input.user_id,
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

		const input = makeProfileInput();

		await profilesRepository.create(input);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: input.user_id,
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

		const input = makeProfileInput();

		await profilesRepository.create(input);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: input.user_id,
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

		const input = makeProfileInput();

		await profilesRepository.create(input);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: input.user_id,
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

		const input = makeProfileInput();

		await profilesRepository.create(input);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: input.user_id,
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
			expect(thrownError.message).toBe("Failed to save profile image");
			expect(thrownError.code).toBe("PROFILE_IMAGE_SAVE_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}
	});
});
