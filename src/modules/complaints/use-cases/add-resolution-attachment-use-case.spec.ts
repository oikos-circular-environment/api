import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { AddResolutionAttachmentUseCase } from "./add-resolution-attachment-use-case.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

class UploadFailStorageProvider implements StorageProvider {
	async uploadFile() {
		return null;
	}
	async deleteFile() {}
	async getFileUrl() {
		return { url: "https://in-memory.storage/fallback.jpeg" };
	}
	async checkFileExists() {
		return false;
	}
	async convertFileToBase64() {
		return "";
	}
	async ping() {}
}

const validFile = {
	fileName: "photo.jpg",
	mimeType: "image/jpeg",
	content: Buffer.from("fake-image-data"),
};

describe("add-resolution-attachment-use-case", () => {
	it("uploads and saves attachment to the user's resolution", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		const result = await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			file: validFile,
		});

		expect(result.id).toBeDefined();
		expect(result.url).toBeDefined();
		expect(result.file_name).toBe("photo.jpg");
		expect(repo.resolutionAttachments).toHaveLength(1);
	});

	it("allows multiple attachments on the same resolution", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			file: { ...validFile, fileName: "a.jpg" },
		});
		await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			file: { ...validFile, fileName: "b.jpg" },
		});

		expect(repo.resolutionAttachments).toHaveLength(2);
	});

	it("throws 404 when user has no resolution on the complaint", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				file: validFile,
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }),
		);
	});

	it("throws 400 for unsupported mime type", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				file: { ...validFile, mimeType: "image/gif" },
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_ATTACHMENT_TYPE_INVALID" }),
		);
	});

	it("throws 400 when file exceeds 10MB", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				file: { ...validFile, content: Buffer.alloc(11 * 1024 * 1024) },
			}),
		).rejects.toThrow(
			expect.objectContaining({ code: "RESOLUTION_ATTACHMENT_TOO_LARGE" }),
		);
	});

	it("throws when upload fails", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const repo = new InMemoryComplaintsRepository();
		const storage = new UploadFailStorageProvider();
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: userBId,
				complaintId: complaint.id,
				file: validFile,
			}),
		).rejects.toThrow(
			expect.objectContaining({
				code: "RESOLUTION_ATTACHMENT_UPLOAD_FAILED",
				statusCode: 500,
			}),
		);
	});

	it("accepts video/mp4 and uses .mp4 extension in storage path", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		const result = await sut.execute({
			userId: userBId,
			complaintId: complaint.id,
			file: {
				fileName: "video.mp4",
				mimeType: "video/mp4",
				content: Buffer.from("video-data"),
			},
		});

		expect(result.url).toMatch(/\.mp4$/);
	});
});
