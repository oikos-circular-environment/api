import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintAttachmentUseCase } from "./create-complaint-attachment-use-case.js";

const geospatial: Geospatial = {
	heading: {
		trueHeading: 10,
		magHeading: 11,
		accuracy: 1,
	},
	location: {
		coords: {
			latitude: -23.55,
			longitude: -46.63,
			altitude: null,
			accuracy: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null,
		},
		timestamp: 1711111111111,
	},
	addresses: {
		city: "Sao Paulo",
		district: "Centro",
		streetNumber: "100",
		street: "Rua A",
		region: "SP",
		subregion: null,
		country: "Brasil",
		postalCode: "01000-000",
		name: null,
		isoCountryCode: "BR",
		timezone: "America/Sao_Paulo",
		formattedAddress: "Rua A, 100 - Centro",
	},
};

describe("create-complaint-attachment-use-case", () => {
	it("attaches image to complaint once", async () => {
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
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaint_id: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		expect(result.attachment?.url).toBe(
			`https://in-memory.storage/complaints/${created.id}.jpeg`,
		);
		expect(result.attachment?.file_name).toBe("1.jpg");
		expect(result.attachment?.type).toBe("PHOTO");
		expect(
			await storageProvider.checkFileExists(`complaints/${created.id}.jpeg`),
		).toBe(true);
	});

	it("throws when complaint already has attachment", async () => {
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
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaint_id: created.id,
			file: {
				fileName: "1.jpg",
				mimeType: "image/jpeg",
				content: Buffer.from("image-content"),
			},
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaint_id: created.id,
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
			expect(thrownError.message).toBe("Complaint attachment already exists");
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_ALREADY_EXISTS");
			expect(thrownError.statusCode).toBe(409);
		}
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
				complaint_id: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaint_id: created.id,
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
				"Complaint attachment type is invalid. Allowed types: jpeg and png",
			);
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_TYPE_INVALID");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when attachment exceeds 10MB", async () => {
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
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaint_id: created.id,
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
				"Complaint attachment exceeds the maximum size of 10MB",
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
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaint_id: created.id,
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
});
