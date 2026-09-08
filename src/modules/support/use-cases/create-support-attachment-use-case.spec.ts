import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import {
	JPEG_MAGIC_BYTES,
	PNG_MAGIC_BYTES,
} from "@/modules/common/test/image-fixtures.js";
import { InMemorySupportsRepository } from "@/modules/support/repositories/in-memory/in-memory-supports-repository.js";
import { CreateSupportAttachmentUseCase } from "./create-support-attachment-use-case.js";

class FailingStorageProvider implements StorageProvider {
	async uploadFile(): Promise<null> {
		return null;
	}
	async deleteFile(): Promise<void> {}
	async getFileUrl(): Promise<{ url: string }> {
		return { url: "" };
	}
	async checkFileExists(): Promise<boolean> {
		return false;
	}
	async convertFileToBase64(): Promise<string> {
		return "";
	}
	async ping(): Promise<void> {}
}

async function createSupport(supportsRepository: InMemorySupportsRepository) {
	return supportsRepository.create({
		title: "App crashes on login",
		description: "It crashes every time I try to log in.",
		type: "ERROR",
		reporter_email: "user@example.com",
	});
}

describe("create-support-attachment-use-case", () => {
	it("uploads and attaches a valid image", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);
		const support = await createSupport(supportsRepository);

		const result = await sut.execute({
			supportId: support.id,
			file: {
				fileName: "screenshot.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		});

		expect(result.attachments).toHaveLength(1);
		expect(result.attachments[0]?.file_name).toBe("screenshot.jpg");
		expect(result.attachments[0]?.url).toMatch(
			new RegExp(
				`^https://in-memory.storage/moderation/support/${support.id}/`,
			),
		);
	});

	it("throws when support does not exist", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: "non-existent-id",
				file: {
					fileName: "screenshot.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws when support has already been moderated", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);
		const support = await createSupport(supportsRepository);
		await supportsRepository.updateStatus(support.id, { status: "RESOLVED" });

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: support.id,
				file: {
					fileName: "screenshot.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ALREADY_MODERATED");
			expect(thrownError.statusCode).toBe(422);
		}
	});

	it("throws when attachment mime type is invalid", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);
		const support = await createSupport(supportsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: support.id,
				file: {
					fileName: "animation.gif",
					mimeType: "image/gif",
					content: Buffer.from("gif-content"),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ATTACHMENT_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment exceeds 10MB", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);
		const support = await createSupport(supportsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: support.id,
				file: {
					fileName: "huge.png",
					mimeType: "image/png",
					content: Buffer.alloc(10 * 1024 * 1024 + 1),
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ATTACHMENT_TOO_LARGE");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when support already has 5 attachments", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);
		const support = await createSupport(supportsRepository);

		for (let i = 0; i < 5; i++) {
			await sut.execute({
				supportId: support.id,
				file: {
					fileName: `${i}.png`,
					mimeType: "image/png",
					content: PNG_MAGIC_BYTES,
				},
			});
		}

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: support.id,
				file: {
					fileName: "one-too-many.png",
					mimeType: "image/png",
					content: PNG_MAGIC_BYTES,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_TOO_MANY_ATTACHMENTS");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when upload fails", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new FailingStorageProvider();
		const sut = new CreateSupportAttachmentUseCase(
			supportsRepository,
			storageProvider,
		);
		const support = await createSupport(supportsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				supportId: support.id,
				file: {
					fileName: "screenshot.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_ATTACHMENT_UPLOAD_FAILED");
			expect(thrownError.statusCode).toBe(500);
		}
	});
});
