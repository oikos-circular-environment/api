import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import {
	JPEG_MAGIC_BYTES,
	PNG_MAGIC_BYTES,
} from "@/modules/common/test/image-fixtures.js";
import { InMemorySupportRequestsRepository } from "@/modules/moderation/repositories/in-memory/in-memory-support-requests-repository.js";
import { InMemoryStorageProvider } from "@/shared/providers/storage/in-memory/in-memory-storage.js";
import { CreateSupportRequestUseCase } from "./create-support-request-use-case.js";

describe("create-support-request-use-case", () => {
	it("creates a support request with no attachments", async () => {
		const supportRequestsRepository = new InMemorySupportRequestsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportRequestUseCase(
			supportRequestsRepository,
			storageProvider,
		);

		const result = await sut.execute({
			title: "App crashes on login",
			description: "It crashes every time I try to log in.",
			files: [],
		});

		expect(result.title).toBe("App crashes on login");
		expect(result.status).toBe("PENDING");
		expect(result.attachments).toHaveLength(0);
	});

	it("creates a support request with multiple image attachments", async () => {
		const supportRequestsRepository = new InMemorySupportRequestsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportRequestUseCase(
			supportRequestsRepository,
			storageProvider,
		);

		const result = await sut.execute({
			title: "Broken checkout",
			description: "Checkout button does nothing.",
			files: [
				{
					fileName: "screenshot-1.png",
					mimeType: "image/png",
					content: PNG_MAGIC_BYTES,
				},
				{
					fileName: "screenshot-2.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			],
		});

		expect(result.attachments).toHaveLength(2);
		expect(result.attachments[0]?.file_name).toBe("screenshot-1.png");
		expect(result.attachments[0]?.url).toMatch(
			new RegExp(`^https://in-memory.storage/moderation/support/${result.id}/`),
		);
		expect(result.attachments[1]?.file_name).toBe("screenshot-2.jpg");
	});

	it("throws when more than 5 files are sent", async () => {
		const supportRequestsRepository = new InMemorySupportRequestsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportRequestUseCase(
			supportRequestsRepository,
			storageProvider,
		);

		const files = Array.from({ length: 6 }, (_, i) => ({
			fileName: `image-${i}.png`,
			mimeType: "image/png",
			content: Buffer.from("png-content"),
		}));

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Too many files",
				description: "Sending too many attachments.",
				files,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_REQUEST_TOO_MANY_FILES");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment mime type is invalid", async () => {
		const supportRequestsRepository = new InMemorySupportRequestsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportRequestUseCase(
			supportRequestsRepository,
			storageProvider,
		);

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Invalid file",
				description: "Sending a gif.",
				files: [
					{
						fileName: "animation.gif",
						mimeType: "image/gif",
						content: Buffer.from("gif-content"),
					},
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Support request attachment type is invalid. Allowed types: jpeg, png",
			);
			expect(thrownError.code).toBe("SUPPORT_REQUEST_ATTACHMENT_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment exceeds 10MB", async () => {
		const supportRequestsRepository = new InMemorySupportRequestsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportRequestUseCase(
			supportRequestsRepository,
			storageProvider,
		);

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Big file",
				description: "Sending a file too big.",
				files: [
					{
						fileName: "huge.png",
						mimeType: "image/png",
						content: Buffer.alloc(10 * 1024 * 1024 + 1),
					},
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Support request attachment exceeds the maximum size of 10MB",
			);
			expect(thrownError.code).toBe("SUPPORT_REQUEST_ATTACHMENT_TOO_LARGE");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment content does not match a real image", async () => {
		const supportRequestsRepository = new InMemorySupportRequestsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportRequestUseCase(
			supportRequestsRepository,
			storageProvider,
		);

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Spoofed file",
				description: "Declaring image/png but sending plain text.",
				files: [
					{
						fileName: "fake.png",
						mimeType: "image/png",
						content: Buffer.from("not-really-a-png"),
					},
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe(
				"Support request attachment content does not match a valid image",
			);
			expect(thrownError.code).toBe(
				"SUPPORT_REQUEST_ATTACHMENT_CONTENT_INVALID",
			);
			expect(thrownError.statusCode).toBe(400);
		}
	});
});
