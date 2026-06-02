import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { AddResolutionAttachmentUseCase } from "./add-resolution-attachment-use-case.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { DeleteResolutionAttachmentUseCase } from "./delete-resolution-attachment-use-case.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

const geospatial: Geospatial = {
	heading: { trueHeading: 0, magHeading: 0, accuracy: 1 },
	location: {
		coords: { latitude: -23.55, longitude: -46.63, altitude: null, accuracy: null, altitudeAccuracy: null, heading: null, speed: null },
		timestamp: 1711111111111,
	},
	addresses: { city: "SP", district: "Centro", street: "Rua A", streetNumber: "1", postalCode: "01000-000", region: "SP", country: "Brasil", name: null, isoCountryCode: "BR", subregion: null, timezone: null },
};

const validFile = {
	fileName: "photo.jpg",
	mimeType: "image/jpeg",
	content: Buffer.from("fake-image-data"),
};

describe("delete-resolution-attachment-use-case", () => {
	it("removes the attachment from the user's resolution", async () => {
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_B,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const attachment = await new AddResolutionAttachmentUseCase(repo, storage).execute({
			userId: USER_B,
			complaintId: complaint.id,
			file: validFile,
		});
		const sut = new DeleteResolutionAttachmentUseCase(repo, storage);

		await sut.execute({ userId: USER_B, complaintId: complaint.id, attachmentId: attachment.id });

		expect(repo.resolutionAttachments).toHaveLength(0);
	});

	it("throws 404 when user has no resolution", async () => {
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		const sut = new DeleteResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id, attachmentId: "any-id" }),
		).rejects.toThrowError(expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }));
	});

	it("throws 404 when attachment does not belong to the resolution", async () => {
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_B,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const sut = new DeleteResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id, attachmentId: "non-existent-attachment" }),
		).rejects.toThrowError(expect.objectContaining({ code: "RESOLUTION_ATTACHMENT_NOT_FOUND" }));
	});
});
