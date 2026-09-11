import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
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
		const { id: resolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			resolutionId,
		});

		expect(repo.resolutions).toHaveLength(0);
	});

	it("throws 404 when complaint does not exist", async () => {
		const userAId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({
				userId: userAId,
				complaintId: "non-existent-id",
				resolutionId: randomUUID(),
			}),
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
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				resolutionId: randomUUID(),
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }),
		);
	});

	it("throws 404 when resolution belongs to another user", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const userCId = randomUUID();
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
		const { id: resolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await expect(
			sut.execute({
				userId: userCId,
				complaintId: complaint.id,
				resolutionId,
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }),
		);
		expect(repo.resolutions).toHaveLength(1);
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
		const { id: resolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
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
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				resolutionId,
			}),
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
		const { id: resolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
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
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				resolutionId,
			}),
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
		const { id: resolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
			userId: userAId,
			complaintId: complaint.id,
			data: { description: "Resolvido pelo próprio criador" },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({
			userId: userAId,
			complaintId: complaint.id,
			resolutionId,
		});

		expect(repo.resolutions).toHaveLength(0);
	});

	it("deletes only the targeted resolution, keeping the user's other resolutions", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const companyId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const companyChecker = { userOwnsCompany: async () => true };
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		const { id: personalResolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido como pessoa física" },
		});
		await new SubmitResolutionUseCase(repo, companyChecker).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido como empresa", company_id: companyId },
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			resolutionId: personalResolutionId,
		});

		expect(repo.resolutions).toHaveLength(1);
		expect(repo.resolutions[0]?.company_id).toBe(companyId);
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
		const { id: resolutionId } = await new SubmitResolutionUseCase(
			repo,
		).execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		await repo.addResolutionAttachment(userBId, resolutionId, {
			url: "https://img.com/a.jpg",
			file_name: "a.jpg",
			path: "p/a.jpg",
		});
		const sut = new DeleteResolutionUseCase(repo);

		await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			resolutionId,
		});

		expect(repo.resolutions).toHaveLength(0);
		expect(repo.resolutionAttachments).toHaveLength(0);
	});
});
