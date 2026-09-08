import { randomUUID } from "node:crypto";
import { assert, describe, expect, it } from "vitest";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { GetResolutionsUseCase } from "./get-resolutions-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

describe("get-resolutions-use-case", () => {
	it("returns empty list when no resolutions exist", async () => {
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
		const sut = new GetResolutionsUseCase(repo);

		const result = await sut.execute({
			complaintId: complaint.id,
			userId: userAId,
		});

		expect(result).toHaveLength(0);
	});

	it("returns all resolutions for a complaint from multiple users", async () => {
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
		const submitUseCase = new SubmitResolutionUseCase(repo);
		await submitUseCase.execute({
			userId: userAId,
			complaintId: complaint.id,
			data: { description: "Resolvido A" },
		});
		await submitUseCase.execute({
			userId: userBId,
			complaintId: complaint.id,
			data: { description: "Resolvido B" },
		});
		const sut = new GetResolutionsUseCase(repo);

		const result = await sut.execute({
			complaintId: complaint.id,
			userId: userAId,
		});

		expect(result).toHaveLength(2);
		expect(result.map((r) => r.description)).toEqual(
			expect.arrayContaining(["Resolvido A", "Resolvido B"]),
		);
		const resolutionA = result.find((r) => r.description === "Resolvido A");
		const resolutionB = result.find((r) => r.description === "Resolvido B");
		expect(resolutionA?.is_owner).toBe(true);
		expect(resolutionB?.is_owner).toBe(false);
	});

	it("each resolution includes its attachments", async () => {
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
			data: { description: "Resolvido" },
		});
		const resolution = await repo.findResolutionByUserAndComplaint(
			userAId,
			complaint.id,
		);
		assert(resolution !== null);
		await repo.addResolutionAttachment(userAId, resolution.id, {
			url: "https://example.com/img.jpg",
			file_name: "img.jpg",
			path: "resolutions/img.jpg",
		});
		const sut = new GetResolutionsUseCase(repo);

		const result = await sut.execute({
			complaintId: complaint.id,
			userId: userAId,
		});

		expect(result[0]?.attachments).toHaveLength(1);
		expect(result[0]?.attachments[0]?.url).toBe("https://example.com/img.jpg");
	});
});
