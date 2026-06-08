import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
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

	it("updates existing resolution instead of creating a duplicate", async () => {
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

		await sut.execute({
			userId: resolverUserId,
			complaintId: complaint.id,
			data: {
				...resolutionData,
				description: "Atualizado: problema resolvido",
			},
		});

		expect(complaintsRepository.resolutions).toHaveLength(1);
		expect(complaintsRepository.resolutions[0].description).toBe(
			"Atualizado: problema resolvido",
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
		).rejects.toThrowError(
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
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});
});
