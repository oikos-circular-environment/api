import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
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
		const sut = new CreateComplaintAttachmentUseCase(complaintsRepository);

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
			data: {
				complaint_id: created.id,
				url: "https://cdn.app/complaints/1.jpg",
				file_name: "1.jpg",
				path: "complaints/1.jpg",
				base64: "YmFzZTY0",
				type: "PHOTO",
			},
		});

		expect(result.attachment?.url).toBe("https://cdn.app/complaints/1.jpg");
		expect(result.attachment?.file_name).toBe("1.jpg");
		expect(result.attachment?.type).toBe("PHOTO");
	});

	it("throws when complaint already has attachment", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintAttachmentUseCase(complaintsRepository);

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
			data: {
				complaint_id: created.id,
				url: "https://cdn.app/complaints/1.jpg",
				file_name: "1.jpg",
				path: "complaints/1.jpg",
				base64: "YmFzZTY0",
				type: "PHOTO",
			},
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				data: {
					complaint_id: created.id,
					url: "https://cdn.app/complaints/2.jpg",
					file_name: "2.jpg",
					path: "complaints/2.jpg",
					base64: "YmFzZTY0Mg==",
					type: "PHOTO",
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
		const sut = new CreateComplaintAttachmentUseCase(complaintsRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				data: {
					complaint_id: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
					url: "https://cdn.app/complaints/2.jpg",
					file_name: "2.jpg",
					path: "complaints/2.jpg",
					base64: "YmFzZTY0Mg==",
					type: "PHOTO",
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
});
