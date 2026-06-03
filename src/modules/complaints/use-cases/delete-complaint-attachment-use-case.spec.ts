import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { StorageProvider } from "@/modules/common/providers/storage/storage.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { DeleteComplaintAttachmentUseCase } from "./delete-complaint-attachment-use-case.js";

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

function makeStorageProvider(): StorageProvider {
	return {
		uploadFile: vi.fn(),
		deleteFile: vi.fn().mockResolvedValue(undefined),
		getFileUrl: vi.fn(),
		checkFileExists: vi.fn(),
		convertFileToBase64: vi.fn(),
	};
}

describe("delete-complaint-attachment-use-case", () => {
	it("removes the attachment from the complaint", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = makeStorageProvider();
		const sut = new DeleteComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{ date: new Date("2026-04-20T10:00:00.000Z"), type: "VACANT_LOT", observations: null, geospatial },
		);

		await complaintsRepository.attachByComplaintId(
			"11111111-1111-1111-1111-111111111111",
			created.id,
			{
				url: "https://example.com/photo.jpg",
				file_name: "photo.jpg",
				path: "complaints/abc/photo.jpg",
				base64: "base64data",
				metadata: null,
				type: "PHOTO",
			},
		);

		const withAttachment = await complaintsRepository.findByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			created.id,
		);
		const attachmentId = withAttachment!.attachments[0]!.id;

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			attachmentId,
		});

		expect(storageProvider.deleteFile).toHaveBeenCalledWith("complaints/abc/photo.jpg");

		const updated = await complaintsRepository.findByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			created.id,
		);
		expect(updated!.attachments).toHaveLength(0);
	});

	it("throws when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = makeStorageProvider();
		const sut = new DeleteComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				attachmentId: "00000000-0000-0000-0000-000000000001",
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

	it("throws when attachment does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const storageProvider = makeStorageProvider();
		const sut = new DeleteComplaintAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{ date: new Date("2026-04-20T10:00:00.000Z"), type: "VACANT_LOT", observations: null, geospatial },
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: created.id,
				attachmentId: "00000000-0000-0000-0000-000000000001",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Attachment not found");
			expect(thrownError.code).toBe("COMPLAINT_ATTACHMENT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
