import { randomUUID } from "node:crypto";
import { assert, describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { DeleteResolutionUseCase } from "./delete-resolution-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

describe("delete-resolution-use-case", () => {
	it("deletes the user's own resolution", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({ userId: userBId, complaintId: complaint.id });

		expect(repo.resolutions).toHaveLength(0);
	});

	it("throws 404 when complaint does not exist", async () => {
		const userAId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: userAId, complaintId: "non-existent-id" }),
		).rejects.toThrow(
			expect.objectContaining({ code: "COMPLAINT_NOT_FOUND", statusCode: 404 }),
		);
	});

	it("throws 404 when user has no resolution on the complaint", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: userBId, complaintId: complaint.id }),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }),
		);
	});

	it("throws 422 when complaint is RESOLVED", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		await repo.updateStatusByUserAndComplaintId(
			userAId,
			complaint.id,
			"RESOLVED",
		);
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: userBId, complaintId: complaint.id }),
		).rejects.toThrow(expect.objectContaining({ code: "COMPLAINT_CLOSED" }));
	});

	it("throws 422 when complaint is CANCELED", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		await repo.updateStatusByUserAndComplaintId(
			userAId,
			complaint.id,
			"CANCELED",
		);
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({ userId: userBId, complaintId: complaint.id }),
		).rejects.toThrow(expect.objectContaining({ code: "COMPLAINT_CLOSED" }));
	});

	it("allows the complaint creator to delete their own resolution", async () => {
		const userAId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: userAId,
			complaintId: complaint.id,
			data: { description: "Resolvido pelo próprio criador" },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({ userId: userAId, complaintId: complaint.id });

		expect(repo.resolutions).toHaveLength(0);
	});

	it("cascades deletion to resolution attachments", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const resolution = await repo.findResolutionByUserAndComplaint(
			userBId,
			complaint.id,
		);
		assert(resolution !== null);
		await repo.addResolutionAttachment(userBId, resolution.id, {
			url: "https://img.com/a.jpg",
			file_name: "a.jpg",
			path: "p/a.jpg",
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({ userId: userBId, complaintId: complaint.id });

		expect(repo.resolutions).toHaveLength(0);
		expect(repo.resolutionAttachments).toHaveLength(0);
	});
});
