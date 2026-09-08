import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintAttachmentUseCase } from "./create-complaint-attachment-use-case.js";

class AttachReturnsNullRepository extends InMemoryComplaintsRepository {
	async attachByComplaintId(): Promise<null> {
		return null;
	}
}

describe("create-complaint-attachment-use-case", () => {
	it("attaches image to complaint", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		expect(result.attachments[0]?.file_name).toBe("1.jpg");
		expect(result.attachments[0]?.type).toBe("PHOTO");
		expect(result.attachments[0]?.url).toMatch(
			new RegExp(`^https://in-memory.storage/complaints/${created.id}/`),
		);
	});

	it("can attach multiple images to a complaint", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			file: {
				fileName: "2.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content-2"),
			},
		});

		expect(result.attachments).toHaveLength(2);
	});

	it("throws when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				file: {
					fileName: "2.jpg",
					mimeType: "image/jpeg",
					content: Buffer.from("image-content-2"),
				},
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

	it("throws when attachment mime type is invalid", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
				file: {
					fileName: "attachment.gif",
					mimeType: "image/gif",
					content: Buffer.from("gif-image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Complaint attachment type is invalid. Allowed types: jpeg, png, mp4, mov, webm",
			);
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment exceeds 50MB", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
				file: {
					fileName: "attachment.png",
					mimeType: "image/png",
					content: Buffer.alloc(50 * 1024 * 1024 + 1),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Complaint attachment exceeds the maximum size of 50MB",
			);
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_TOO_LARGE");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when upload fails", async () => {
		class UploadFailStorageProvider implements StorageProvider {
			async uploadFile() {
				return null;
			}

			async deleteFile() {}

			async getFileUrl() {
				return { url: "https://in-memory.storage/complaints/fallback.jpeg" };
			}

			async checkFileExists() {
				return false;
			}

			async convertFileToBase64() {
				return "";
			}

			async ping() {}
		}

		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new UploadFailStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
				file: {
					fileName: "attachment.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Failed to upload complaint attachment");
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_UPLOAD_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}
	});

	it("rolls back the complaint when upload fails", async () => {
		class UploadFailStorageProvider implements StorageProvider {
			async uploadFile() {
				return null;
			}

			async deleteFile() {}

			async getFileUrl() {
				return { url: "https://in-memory.storage/complaints/fallback.jpeg" };
			}

			async checkFileExists() {
				return false;
			}

			async convertFileToBase64() {
				return "";
			}

			async ping() {}
		}

		const complaintsRepository = new InMemoryComplaintsRepository();
		const deleteByUserAndComplaintIdSpy = vi.spyOn(
			complaintsRepository,
			"deleteByUserAndComplaintId",
		);
		const storageProvider = new UploadFailStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
				file: {
					fileName: "attachment.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(deleteByUserAndComplaintIdSpy).toHaveBeenCalledWith(
			"11111111-1111-1111-1111-111111111111",
			created.id,
		);

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Failed to upload complaint attachment");
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_UPLOAD_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}

		const remainingComplaint =
			await complaintsRepository.findByUserAndComplaintId(
				"11111111-1111-1111-1111-111111111111",
				created.id,
			);
		expect(remainingComplaint).toBeNull();
	});

	it("throws when attach returns null after upload succeeds", async () => {
		const complaintsRepository = new AttachReturnsNullRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
				file: {
					fileName: "attachment.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
				},
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

	it("accepts video/mp4 and sets type to VIDEO", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			file: {
				fileName: "video.mp4",
				mimeType: "video/mp4",
				content: Buffer.from("video-data"),
			},
		});

		expect(result.attachments[0]?.type).toBe("VIDEO");
		expect(result.attachments[0]?.url).toMatch(/\.mp4$/);
	});

	it("accepts video/quicktime and sets type to VIDEO", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date(),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			file: {
				fileName: "clip.mov",
				mimeType: "video/quicktime",
				content: Buffer.from("video-data"),
			},
		});

		expect(result.attachments[0]?.type).toBe("VIDEO");
		expect(result.attachments[0]?.url).toMatch(/\.mov$/);
	});
});
