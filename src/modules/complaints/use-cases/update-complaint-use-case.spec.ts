import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { WASTE_CATEGORIES_SEED } from "@/modules/wastes/data/waste-categories-seed.js";
import { UpdateComplaintUseCase } from "./update-complaint-use-case.js";

describe("update-complaint-use-case", () => {
	it("updates complaint observations", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: "Inicial",
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { observations: "Atualizada" },
		});

		expect(result.id).toBe(created.id);
		expect(result.observations).toBe("Atualizada");
	});

	it("updates complaint waste categories", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { waste_category_ids: [WASTE_CATEGORIES_SEED[1].id] },
		});

		expect(result.id).toBe(created.id);
	});

	it("updates complaint geospatial", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const geo = makeGeospatial();
		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: null,
				geospatial: geo,
			},
		);

		const updatedGeospatial = makeGeospatial({
			addresses: { ...geo.addresses, city: "Rio de Janeiro" },
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { geospatial: updatedGeospatial },
		});

		expect(result.geospatial.addresses.city).toBe("Rio de Janeiro");
	});

	it("updates complaint date", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const newDate = new Date("2026-05-01T08:00:00.000Z");
		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { date: newDate },
		});

		expect(result.date).toEqual(newDate);
	});

	it("throws when complaint has votes", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
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
				data: { observations: "Tentativa de edição" },
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Complaint with votes cannot be updated",
			);
			expect(thrownError.code).toBe("COMPLAINT_HAS_VOTES");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws when complaint has resolutions", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
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
				data: { observations: "Tentativa de edição" },
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Complaint with resolutions cannot be updated",
			);
			expect(thrownError.code).toBe("COMPLAINT_HAS_RESOLUTIONS");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				data: { observations: "Nova observacao" },
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
