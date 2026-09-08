import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { UploadCompanyAvatarUseCase } from "./upload-company-avatar-use-case.js";

class UploadFailStorageProvider implements StorageProvider {
	async uploadFile() {
		return null;
	}
	async deleteFile() {}
	async getFileUrl() {
		return { url: "https://in-memory.storage/fallback.jpeg" };
	}
	async checkFileExists() {
		return false;
	}
	async convertFileToBase64() {
		return "";
	}
	async ping() {}
}

class UploadAvatarReturnsNullRepository extends InMemoryCompaniesRepository {
	async uploadAvatar(): Promise<null> {
		return null;
	}
}

describe("upload-company-avatar-use-case", () => {
	it("uploads avatar successfully", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		const result = await sut.execute({
			userId,
			companyId: created.id,
			file: {
				fileName: "avatar.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		expect(result.avatar?.url).toBe(
			`https://in-memory.storage/companies/${created.id}.jpeg`,
		);
		expect(result.avatar?.file_name).toBe("avatar.jpg");
		expect(result.avatar?.path).toBe(`companies/${created.id}.jpeg`);
		expect(
			await storageProvider.checkFileExists(`companies/${created.id}.jpeg`),
		).toBe(true);
	});

	it("throws when company does not exist for user", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: randomUUID(),
				file: {
					fileName: "avatar.jpg",
					mimeType: "image/jpeg",
					content: Buffer.from("image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Company not found");
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws when company belongs to a different user", async () => {
		const userId = randomUUID();
		const anotherUserId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: anotherUserId,
				companyId: created.id,
				file: {
					fileName: "avatar.jpg",
					mimeType: "image/jpeg",
					content: Buffer.from("image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Company not found");
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws when mime type is invalid", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: created.id,
				file: {
					fileName: "avatar.gif",
					mimeType: "image/gif",
					content: Buffer.from("gif-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Company avatar type is invalid. Allowed types: jpeg and png",
			);
			expect(thrownError.code).toBe("COMPANY_AVATAR_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when upload fails", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new UploadFailStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: created.id,
				file: {
					fileName: "avatar.jpg",
					mimeType: "image/jpeg",
					content: Buffer.from("image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Failed to upload company avatar");
			expect(thrownError.code).toBe("COMPANY_AVATAR_UPLOAD_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}
	});

	it("throws when uploadAvatar returns null after upload succeeds", async () => {
		const userId = randomUUID();
		const companiesRepository = new UploadAvatarReturnsNullRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: created.id,
				file: {
					fileName: "avatar.jpg",
					mimeType: "image/jpeg",
					content: Buffer.from("image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Company not found");
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("deletes old storage file when re-uploading with a different extension", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		// First upload: JPEG
		await sut.execute({
			userId,
			companyId: created.id,
			file: {
				fileName: "avatar.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("jpeg-content"),
			},
		});

		const oldPath = `companies/${created.id}.jpeg`;
		expect(await storageProvider.checkFileExists(oldPath)).toBe(true);

		// Second upload: PNG — old JPEG should be removed
		await sut.execute({
			userId,
			companyId: created.id,
			file: {
				fileName: "avatar.png",
				mimeType: "image/png",
				content: Buffer.from("png-content"),
			},
		});

		expect(await storageProvider.checkFileExists(oldPath)).toBe(false);
		expect(
			await storageProvider.checkFileExists(`companies/${created.id}.png`),
		).toBe(true);
	});

	it("throws when file exceeds 5MB", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: created.id,
				file: {
					fileName: "avatar.png",
					mimeType: "image/png",
					content: Buffer.alloc(5 * 1024 * 1024 + 1),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Company avatar exceeds the maximum size of 5MB",
			);
			expect(thrownError.code).toBe("COMPANY_AVATAR_TOO_LARGE");
			expect(thrownError.statusCode).toBe(400);
		}
	});
});
