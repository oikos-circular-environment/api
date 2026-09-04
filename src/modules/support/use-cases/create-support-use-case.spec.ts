import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import {
	JPEG_MAGIC_BYTES,
	PNG_MAGIC_BYTES,
} from "@/modules/common/test/image-fixtures.js";
import { InMemorySupportsRepository } from "@/modules/support/repositories/in-memory/in-memory-supports-repository.js";
import { CreateSupportUseCase } from "./create-support-use-case.js";

describe("create-support-use-case", () => {
	it("creates a support with no attachments", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		const result = await sut.execute({
			title: "App crashes on login",
			description: "It crashes every time I try to log in.",
			type: "ERROR",
			reporter_email: "user@example.com",
			files: [],
		});

		expect(result.title).toBe("App crashes on login");
		expect(result.type).toBe("ERROR");
		expect(result.status).toBe("OPEN");
		expect(result.reporter_email).toBe("user@example.com");
		expect(result.attachments).toHaveLength(0);
	});

	it("defaults type to SUPPORT when omitted", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		const result = await sut.execute({
			title: "Feature idea",
			description: "It would be nice to have dark mode.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			files: [],
		});

		expect(result.type).toBe("SUPPORT");
	});

	it("stores environment (with last_error) when provided", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		const result = await sut.execute({
			title: "Crash on submit",
			description: "App crashes when I tap submit.",
			type: "ERROR",
			reporter_email: "user@example.com",
			environment: {
				platform: "android",
				app_version: "1.2.3",
				os_version: "14",
				screen_size: "MEDIUM",
				last_error: {
					message: "Cannot read property of undefined",
					stack: "at Foo (index.js:1:1)",
					occurred_at: "2026-09-03T10:00:00.000Z",
				},
			},
			files: [],
		});

		expect(result.environment?.platform).toBe("android");
		expect(result.environment?.last_error?.message).toBe(
			"Cannot read property of undefined",
		);
	});

	it("stores null environment when not provided", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		const result = await sut.execute({
			title: "General feedback",
			description: "Just some feedback.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			files: [],
		});

		expect(result.environment).toBeNull();
	});

	it("associates the support with the authenticated user", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		await sut.execute({
			userId: "user-1",
			title: "Logged-in report",
			description: "Reporting while logged in.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			files: [],
		});

		expect(supportsRepository.supports[0]?.user_id).toBe("user-1");
	});

	it("sets user_id to null when created without a session", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		await sut.execute({
			title: "Anonymous report",
			description: "Reporting without a session.",
			type: "SUPPORT",
			reporter_email: "user@example.com",
			files: [],
		});

		expect(supportsRepository.supports[0]?.user_id).toBeNull();
	});

	it("creates a support with multiple image attachments", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		const result = await sut.execute({
			title: "Broken checkout",
			description: "Checkout button does nothing.",
			type: "ERROR",
			reporter_email: "user@example.com",
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
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

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
				type: "ERROR",
				reporter_email: "user@example.com",
				files,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("SUPPORT_TOO_MANY_FILES");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment mime type is invalid", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Invalid file",
				description: "Sending a gif.",
				type: "ERROR",
				reporter_email: "user@example.com",
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
				"Support attachment type is invalid. Allowed types: jpeg, png",
			);
			expect(thrownError.code).toBe("SUPPORT_ATTACHMENT_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment exceeds 10MB", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Big file",
				description: "Sending a file too big.",
				type: "ERROR",
				reporter_email: "user@example.com",
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
				"Support attachment exceeds the maximum size of 10MB",
			);
			expect(thrownError.code).toBe("SUPPORT_ATTACHMENT_TOO_LARGE");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment content does not match a real image", async () => {
		const supportsRepository = new InMemorySupportsRepository();
		const storageProvider = new InMemoryStorageProvider();
		const sut = new CreateSupportUseCase(supportsRepository, storageProvider);

		let thrownError: unknown;
		try {
			await sut.execute({
				title: "Spoofed file",
				description: "Declaring image/png but sending plain text.",
				type: "ERROR",
				reporter_email: "user@example.com",
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
				"Support attachment content does not match a valid image",
			);
			expect(thrownError.code).toBe("SUPPORT_ATTACHMENT_CONTENT_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});
});
