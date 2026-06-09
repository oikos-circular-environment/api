import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { ResolveComplaintUseCase } from "./resolve-complaint-use-case.js";

const resolution = {
	description: "Problema resolvido pela prefeitura",
};

describe("resolve-complaint-use-case", () => {
	it("registers resolution and vote when resolving a complaint", async () => {
		const userId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(userId, {
			date: new Date("2026-04-20T10:00:00.000Z"),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await sut.execute({ userId, complaintId: created.id, resolution });

		expect(complaintsRepository.resolutions).toHaveLength(1);
		expect(complaintsRepository.resolutions[0].description).toBe(
			resolution.description,
		);
		expect(complaintsRepository.votes).toHaveLength(1);
		expect(complaintsRepository.votes[0].vote_type).toBe("RESOLVED");
	});

	it("throws when complaint does not exist", async () => {
		const userId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				complaintId: randomUUID(),
				resolution,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Complaint not found");
			expect(thrownError.code).toBe("COMPLAINT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is already RESOLVED", async () => {
		const userId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});
		await complaintsRepository.updateStatusByUserAndComplaintId(
			userId,
			created.id,
			"RESOLVED",
		);

		let thrownError: unknown;
		try {
			await sut.execute({ userId, complaintId: created.id, resolution });
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
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});
		await complaintsRepository.updateStatusByUserAndComplaintId(
			userId,
			created.id,
			"CANCELED",
		);

		await expect(
			sut.execute({ userId, complaintId: created.id, resolution }),
		).rejects.toThrowError(
			expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }),
		);
	});

	it("calls job dispatcher with the complaint id", async () => {
		const userId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const dispatchQuorumJob = vi.fn().mockResolvedValue(undefined);
		const jobDispatcher = { dispatchGroupingJob: vi.fn(), dispatchQuorumJob };
		const sut = new ResolveComplaintUseCase(
			complaintsRepository,
			jobDispatcher,
		);

		const created = await complaintsRepository.createForUser(userId, {
			date: new Date(),
			waste_category_ids: ["waste-category-id"],
			observations: null,
			geospatial: makeGeospatial(),
		});

		await sut.execute({ userId, complaintId: created.id, resolution });

		expect(dispatchQuorumJob).toHaveBeenCalledWith(created.id);
	});
});
