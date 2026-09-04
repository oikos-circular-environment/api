import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import { JPEG_MAGIC_BYTES } from "@/modules/common/test/image-fixtures.js";
import { InMemoryDenunciationsRepository } from "@/modules/denunciation/repositories/in-memory/in-memory-denunciations-repository.js";
import { CreateDenunciationAttachmentUseCase } from "./create-denunciation-attachment-use-case.js";
import { DeleteDenunciationAttachmentUseCase } from "./delete-denunciation-attachment-use-case.js";

const REPORTER_USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

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
			reporter_user_id: REPORTER_USER_ID,
		});

		const withAttachment = await createAttachment.execute({
			denunciationId: created.id,
			userId: REPORTER_USER_ID,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		});

		const attachmentId = withAttachment.attachments[0]?.id as string;

		await sut.execute({
			denunciationId: created.id,
			userId: REPORTER_USER_ID,
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
			reporter_user_id: REPORTER_USER_ID,
		});

		const withAttachment = await createAttachment.execute({
			denunciationId: created.id,
			userId: REPORTER_USER_ID,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		});

		const attachment = withAttachment.attachments[0];
		if (!attachment) throw new Error("attachment not created");

		expect(await storageProvider.checkFileExists(attachment.path)).toBe(true);

		await sut.execute({
			denunciationId: created.id,
			userId: REPORTER_USER_ID,
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
				userId: REPORTER_USER_ID,
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

	it("throws when user is not the denunciation owner", async () => {
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
			reporter_user_id: REPORTER_USER_ID,
		});

		const withAttachment = await createAttachment.execute({
			denunciationId: created.id,
			userId: REPORTER_USER_ID,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		});

		const attachmentId = withAttachment.attachments[0]?.id as string;

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
				userId: OTHER_USER_ID,
				attachmentId,
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

	it("throws when denunciation has already been moderated", async () => {
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
			reporter_user_id: REPORTER_USER_ID,
		});

		const withAttachment = await createAttachment.execute({
			denunciationId: created.id,
			userId: REPORTER_USER_ID,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		});

		const attachmentId = withAttachment.attachments[0]?.id as string;

		await denunciationsRepository.updateStatus(created.id, {
			status: "RESOLVED",
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
				userId: REPORTER_USER_ID,
				attachmentId,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Denunciation has already been moderated",
			);
			expect(thrownError.code).toBe("DENUNCIATION_ALREADY_MODERATED");
			expect(thrownError.statusCode).toBe(422);
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
			reporter_user_id: REPORTER_USER_ID,
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				denunciationId: created.id,
				userId: REPORTER_USER_ID,
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
