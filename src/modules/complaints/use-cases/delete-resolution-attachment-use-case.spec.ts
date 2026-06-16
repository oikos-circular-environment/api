import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { AddResolutionAttachmentUseCase } from "./add-resolution-attachment-use-case.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { DeleteResolutionAttachmentUseCase } from "./delete-resolution-attachment-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

const validFile = {
	fileName: "photo.jpg",
	mimeType: "image/jpeg",
	content: Buffer.from("fake-image-data"),
};

describe("delete-resolution-attachment-use-case", () => {
	it("removes the attachment from the user's resolution", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
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
		const attachment = await new AddResolutionAttachmentUseCase(
			repo,
			storage,
		).execute({
			userId: userBId,
			complaintId: complaint.id,
			file: validFile,
		});
		const sut = new DeleteResolutionAttachmentUseCase(repo, storage);

		await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			attachmentId: attachment.id,
		});

		expect(repo.resolutionAttachments).toHaveLength(0);
	});

	it("throws 404 when user has no resolution", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: userAId,
			data: {
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});
		const sut = new DeleteResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				attachmentId: "any-id",
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }),
		);
	});

	it("throws 404 when attachment does not belong to the resolution", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
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
		const sut = new DeleteResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				attachmentId: "non-existent-attachment",
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_ATTACHMENT_NOT_FOUND" }),
		);
	});
});
