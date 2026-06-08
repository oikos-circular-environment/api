import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { UploadCompanyAvatarUseCase } from "./upload-company-avatar-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ANOTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

describe("upload-company-avatar-use-case", () => {
	it("uploads avatar successfully", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new UploadCompanyAvatarUseCase(
			companiesRepository,
			storageProvider,
		);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		const result = await sut.execute({
			userId: USER_ID,
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
				userId: USER_ID,
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

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: ANOTHER_USER_ID,
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

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
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

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
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
