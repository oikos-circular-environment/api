import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

const resolutionData = {
	description: "Prefeitura recolheu o lixo",
};

describe("submit-resolution-use-case", () => {
	it("creates resolution when it does not exist", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await sut.execute({
			userId: resolverUserId,
			complaintId: complaint.id,
			data: resolutionData,
		});

		expect(complaintsRepository.resolutions).toHaveLength(1);
		expect(complaintsRepository.resolutions[0].description).toBe(
			resolutionData.description,
		);
	});

	it("throws 422 when submitting a personal resolution that already exists", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await sut.execute({
			userId: resolverUserId,
			complaintId: complaint.id,
			data: resolutionData,
		});

		await expect(
			sut.execute({
				userId: resolverUserId,
				complaintId: complaint.id,
				data: { ...resolutionData, description: "Segunda tentativa" },
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_ALREADY_EXISTS", statusCode: 422 }),
		);

		expect(complaintsRepository.resolutions).toHaveLength(1);
	});

	it("allows multiple resolutions from the same user for different companies", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const companyAId = randomUUID();
		const companyBId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const companyChecker = { userOwnsCompany: async () => true };
		const sut = new SubmitResolutionUseCase(complaintsRepository, companyChecker);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await sut.execute({
			userId: resolverUserId,
			complaintId: complaint.id,
			data: { ...resolutionData, company_id: companyAId },
		});
		await sut.execute({
			userId: resolverUserId,
			complaintId: complaint.id,
			data: { ...resolutionData, company_id: companyBId },
		});

		expect(complaintsRepository.resolutions).toHaveLength(2);
	});

	it("throws 422 when submitting again with same user and same company", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const companyId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const companyChecker = { userOwnsCompany: async () => true };
		const sut = new SubmitResolutionUseCase(complaintsRepository, companyChecker);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await sut.execute({
			userId: resolverUserId,
			complaintId: complaint.id,
			data: { ...resolutionData, company_id: companyId },
		});

		await expect(
			sut.execute({
				userId: resolverUserId,
				complaintId: complaint.id,
				data: { ...resolutionData, company_id: companyId },
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_ALREADY_EXISTS", statusCode: 422 }),
		);
	});

	it("throws 404 when complaint does not exist", async () => {
		const resolverUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: resolverUserId,
				complaintId: randomUUID(),
				data: resolutionData,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(404);
			expect(thrownError.code).toBe("COMPLAINT_NOT_FOUND");
		}
	});

	it("throws 403 when company_id does not belong to the user", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const companyChecker = { userOwnsCompany: async () => false };
		const sut = new SubmitResolutionUseCase(
			complaintsRepository,
			companyChecker,
		);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await expect(
			sut.execute({
				userId: resolverUserId,
				complaintId: complaint.id,
				data: { ...resolutionData, company_id: randomUUID() },
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPANY_NOT_OWNED" }),
		);
	});

	it("accepts company_id when it belongs to the user", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const companyId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const companyChecker = { userOwnsCompany: async () => true };
		const sut = new SubmitResolutionUseCase(
			complaintsRepository,
			companyChecker,
		);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await expect(
			sut.execute({
				userId: resolverUserId,
				complaintId: complaint.id,
				data: { ...resolutionData, company_id: companyId },
			}),
		).resolves.not.toThrow();
		expect(complaintsRepository.resolutions[0]?.company_id).toBe(companyId);
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});
		await complaintsRepository.updateStatusByUserAndComplaintId(
			userId,
			complaint.id,
			"RESOLVED",
		);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: resolverUserId,
				complaintId: complaint.id,
				data: resolutionData,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(422);
			expect(thrownError.code).toBe("COMPLAINT_CLOSED");
		}
	});

	it("allows the complaint creator to submit a resolution", async () => {
		const userId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await expect(
			sut.execute({
				userId,
				complaintId: complaint.id,
				data: resolutionData,
			}),
		).resolves.not.toThrow();

		expect(complaintsRepository.resolutions).toHaveLength(1);
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is CANCELED", async () => {
		const userId = randomUUID();
		const resolverUserId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});
		await complaintsRepository.updateStatusByUserAndComplaintId(
			userId,
			complaint.id,
			"CANCELED",
		);

		await expect(
			sut.execute({
				userId: resolverUserId,
				complaintId: complaint.id,
				data: resolutionData,
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
