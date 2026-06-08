import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { CancelComplaintUseCase } from "./cancel-complaint-use-case.js";

describe("cancel-complaint-use-case", () => {
	it("changes status to CANCELED", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CancelComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
		});

		expect(result.status).toBe("CANCELED");
	});

	it("throws when complaint has votes", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CancelComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		await complaintsRepository.voteOnComplaint(
			"22222222-2222-2222-2222-222222222222",
			created.id,
			"RESOLVED",
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Complaint with votes cannot be canceled");
			expect(thrownError.code).toBe("COMPLAINT_HAS_VOTES");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws when complaint has resolutions", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CancelComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		await complaintsRepository.submitResolution(
			"22222222-2222-2222-2222-222222222222",
			created.id,
			{ description: "Resolved the issue" },
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Complaint with resolutions cannot be canceled");
			expect(thrownError.code).toBe("COMPLAINT_HAS_RESOLUTIONS");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CancelComplaintUseCase(complaintsRepository);

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
