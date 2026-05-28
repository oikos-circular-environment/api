import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { UploadCompanyAvatarUseCase } from "./upload-company-avatar-use-case.js";

const baseCompany = {
	user_id: "11111111-1111-1111-1111-111111111111",
	identity: "12345678900",
	identity_type: "CPF" as const,
	company_type: "COMPANY" as const,
	status: true,
	is_headquarters: false,
	business_name: "Oikos Tech",
	corporate_name: "Oikos Tech LTDA",
	accept_appointments: false,
	email: "contato@oikos.dev",
	phones: ["5511999999999"],
	started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
	description: null,
};

describe("upload-company-avatar-use-case", () => {
	it("uploads avatar successfully", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(baseCompany);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "22222222-2222-2222-2222-222222222222",
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(baseCompany);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
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

	it("throws when file exceeds 5MB", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(baseCompany);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
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
