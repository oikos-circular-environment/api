import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import { InMemoryDenunciationsRepository } from "@/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.js";
import { CreateDenunciationAttachmentUseCase } from "./create-denunciation-attachment-use-case.js";
import { DeleteDenunciationAttachmentUseCase } from "./delete-denunciation-attachment-use-case.js";

describe("delete-denunciation-attachment-use-case", () => {
	it("deletes an attachment from the denunciation", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const createAttachment = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);
		const sut = new DeleteDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		const withAttachment = await createAttachment.execute({
			denunciationId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		const attachmentId = withAttachment.attachments[0]?.id as string;

		await sut.execute({
			denunciationId: created.id,
			attachmentId,
		});

		const result = await denunciationsRepository.findById(created.id);
		expect(result?.attachments).toHaveLength(0);
	});

	it("removes the file from storage", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const createAttachment = new CreateDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);
		const sut = new DeleteDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		const created = await denunciationsRepository.create({
			title: "Fake profile",
			description: "This looks like a scam.",
			reporter_email: "reporter@example.com",
		});

		const withAttachment = await createAttachment.execute({
			denunciationId: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		const attachment = withAttachment.attachments[0];
		if (!attachment) throw new Error("attachment not created");

		expect(await storageProvider.checkFileExists(attachment.path)).toBe(true);

		await sut.execute({
			denunciationId: created.id,
			attachmentId: attachment.id,
		});

		expect(await storageProvider.checkFileExists(attachment.path)).toBe(false);
	});

	it("throws when denunciation does not exist", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new DeleteDenunciationAttachmentUseCase(
			denunciationsRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				attachmentId: "8b2c1e42-90cb-4f21-9a1f-4f13a9dc6b1d",
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

	it("throws when attachment does not exist", async () => {
		const denunciationsRepository = new InMemoryDenunciationsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new DeleteDenunciationAttachmentUseCase(
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
				attachmentId: "8b2c1e42-90cb-4f21-9a1f-4f13a9dc6b1d",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Attachment not found");
			expect(thrownError.code).toBe("DENUNCIATION_ATTACHMENT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
