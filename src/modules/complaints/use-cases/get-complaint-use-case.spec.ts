import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { GetComplaintUseCase } from "./get-complaint-use-case.js";

describe("get-complaint-use-case", () => {
	it("returns complaint by id for user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "IRREGULAR_DISPOSAL",
				observations: "Descarte de pneus",
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
		});

		expect(result.id).toBe(created.id);
		expect(result.type).toBe("IRREGULAR_DISPOSAL");
		expect(result.observations).toBe("Descarte de pneus");
		expect(result.attachments).toHaveLength(0);
	});

	it("throws when complaint does not exist for user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintUseCase(complaintsRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
});
