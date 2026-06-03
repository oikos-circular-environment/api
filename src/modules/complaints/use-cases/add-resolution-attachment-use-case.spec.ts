import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryStorageProvider } from "@/modules/common/providers/storage/in-memory/in-memory-storage.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { AddResolutionAttachmentUseCase } from "./add-resolution-attachment-use-case.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
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

describe("add-resolution-attachment-use-case", () => {
	it("uploads and saves attachment to the user's resolution", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		const result = await sut.execute({ userId: USER_B, complaintId: complaint.id, file: validFile });

		expect(result.id).toBeDefined();
		expect(result.url).toBeDefined();
		expect(result.file_name).toBe("photo.jpg");
		expect(repo.resolutionAttachments).toHaveLength(1);
	});

	it("allows multiple attachments on the same resolution", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await sut.execute({ userId: USER_B, complaintId: complaint.id, file: { ...validFile, fileName: "a.jpg" } });
		await sut.execute({ userId: USER_B, complaintId: complaint.id, file: { ...validFile, fileName: "b.jpg" } });

		expect(repo.resolutionAttachments).toHaveLength(2);
	});

	it("throws 404 when user has no resolution on the complaint", async () => {
		const repo = new InMemoryComplaintsRepository();
		const storage = new InMemoryStorageProvider();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id, file: validFile }),
		).rejects.toThrowError(expect.objectContaining({ code: "RESOLUTION_NOT_FOUND" }));
	});

	it("throws 400 for unsupported mime type", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({ userId: USER_B, complaintId: complaint.id, file: { ...validFile, mimeType: "image/gif" } }),
		).rejects.toThrowError(expect.objectContaining({ code: "RESOLUTION_ATTACHMENT_TYPE_INVALID" }));
	});

	it("throws 400 when file exceeds 10MB", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		await expect(
			sut.execute({
				userId: USER_B,
				complaintId: complaint.id,
				file: { ...validFile, content: Buffer.alloc(11 * 1024 * 1024) },
			}),
		).rejects.toThrowError(expect.objectContaining({ code: "RESOLUTION_ATTACHMENT_TOO_LARGE" }));
	});

	it("accepts video/mp4 and uses .mp4 extension in storage path", async () => {
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
		const sut = new AddResolutionAttachmentUseCase(repo, storage);

		const result = await sut.execute({
			userId: USER_B,
			complaintId: complaint.id,
			file: { fileName: "video.mp4", mimeType: "video/mp4", content: Buffer.from("video-data") },
		});

		expect(result.url).toMatch(/\.mp4$/);
	});
});
