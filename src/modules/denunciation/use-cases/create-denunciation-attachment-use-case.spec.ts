import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import { InMemoryDenunciationsRepository } from "@/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.js";
import { CreateDenunciationAttachmentUseCase } from "./create-denunciation-attachment-use-case.js";

class AttachReturnsNullRepository extends InMemoryDenunciationsRepository {
	async attach(): Promise<null> {
		return null;
	}
}

describe("create-denunciation-attachment-use-case", () => {
	it("attaches image to denunciation", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		const result = await sut.execute({
			denunciationId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		expect(result.attachments[0]?.file_name).toBe("1.jpg");
		expect(result.attachments[0]?.type).toBe("PHOTO");
		expect(result.attachments[0]?.url).toMatch(
			new RegExp(`^https://in-memory.storage/denunciations/${created.id}/`),
		);
	});

	it("can attach multiple files to a denunciation", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		await sut.execute({
			denunciationId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		const result = await sut.execute({
			denunciationId: created.id,
			file: {
				fileName: "2.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content-2"),
			},
		});

		expect(result.attachments).toHaveLength(2);
	});

	it("throws when denunciation does not exist", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
			expect(thrownError.message).toBe("Denunciation not found");
			expect(thrownError.code).toBe("DENUNCIATION_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws when attachment mime type is invalid", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
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
				"Denunciation attachment type is invalid. Allowed types: jpeg, png, mp4, mov, webm",
			);
			expect(thrownError.code).toBe("DENUNCIATION_ATTACHMENT_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment exceeds 10MB", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
				file: {
					fileName: "attachment.png",
					mimeType: "image/png",
					content: Buffer.alloc(10 * 1024 * 1024 + 1),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Denunciation attachment exceeds the maximum size of 10MB",
			);
			expect(thrownError.code).toBe("DENUNCIATION_ATTACHMENT_TOO_LARGE");
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
				return { url: "https://in-memory.storage/denunciations/fallback.jpeg" };
			}

			async checkFileExists() {
				return false;
			}

			async convertFileToBase64() {
				return "";
			}
		}

		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new UploadFailStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
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
			expect(thrownError.message).toBe(
				"Failed to upload denunciation attachment",
			);
			expect(thrownError.code).toBe("DENUNCIATION_ATTACHMENT_UPLOAD_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}
	});

	it("throws when attach returns null after upload succeeds", async () => {
		const denunciationsRepository = new AttachReturnsNullRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
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
			expect(thrownError.message).toBe("Denunciation not found");
			expect(thrownError.code).toBe("DENUNCIATION_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("accepts video/mp4 and sets type to VIDEO", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		const result = await sut.execute({
			denunciationId: created.id,
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
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		const result = await sut.execute({
			denunciationId: created.id,
			file: {
				fileName: "clip.mov",
				mimeType: "video/quicktime",
				content: Buffer.from("video-data"),
			},
		});

		expect(result.attachments[0]?.type).toBe("VIDEO");
		expect(result.attachments[0]?.url).toMatch(/\.mov$/);
	});

	it("stores the file content as base64", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		const result = await sut.execute({
			denunciationId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		expect(result.attachments[0]?.base64).toBe(
			Buffer.from("image-content").toString("base64"),
		);
	});

	it("does not roll back the denunciation when upload fails", async () => {
		class UploadFailStorageProvider implements StorageProvider {
			async uploadFile() {
				return null;
			}

			async deleteFile() {}

			async getFileUrl() {
				return { url: "https://in-memory.storage/denunciations/fallback.jpeg" };
			}

			async checkFileExists() {
				return false;
			}

			async convertFileToBase64() {
				return "";
			}
		}

		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const deleteSpy = vi.spyOn(denunciationsRepository, "deleteAttachment");
		const storageProvider = new UploadFailStorageProvider();
		const sut = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		try {
			await sut.execute({
				denunciationId: created.id,
				file: {
					fileName: "attachment.jpeg",
					mimeType: "image/jpeg",
					content: Buffer.from("jpeg-image-content"),
				},
			});
		} catch {
			// expected
		}

		expect(deleteSpy).not.toHaveBeenCalled();

		const remaining = await denunciationsRepository.findById(created.id);
		expect(remaining).not.toBeNull();
	});
});
