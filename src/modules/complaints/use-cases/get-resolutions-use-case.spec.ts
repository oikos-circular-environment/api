import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";
import { GetResolutionsUseCase } from "./get-resolutions-use-case.js";
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

describe("get-resolutions-use-case", () => {
	it("returns empty list when no resolutions exist", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		const sut = new GetResolutionsUseCase(repo);

		const result = await sut.execute({ complaintId: complaint.id });

		expect(result).toHaveLength(0);
	});

	it("returns all resolutions for a complaint from multiple users", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		const submitUseCase = new SubmitResolutionUseCase(repo);
		await submitUseCase.execute({ userId: USER_A, complaintId: complaint.id, data: { description: "Resolvido A" } });
		await submitUseCase.execute({ userId: USER_B, complaintId: complaint.id, data: { description: "Resolvido B" } });
		const sut = new GetResolutionsUseCase(repo);

		const result = await sut.execute({ complaintId: complaint.id });

		expect(result).toHaveLength(2);
		expect(result.map((r) => r.description)).toEqual(
			expect.arrayContaining(["Resolvido A", "Resolvido B"]),
		);
	});

	it("each resolution includes its attachments", async () => {
		const repo = new InMemoryComplaintsRepository();
		const complaint = await new CreateComplaintUseCase(repo).execute({
			userId: USER_A,
			data: { date: new Date(), type: "BURNING", observations: null, geospatial },
		});
		await new SubmitResolutionUseCase(repo).execute({
			userId: USER_A,
			complaintId: complaint.id,
			data: { description: "Resolvido" },
		});
		const resolution = await repo.findResolutionByUserAndComplaint(USER_A, complaint.id);
		await repo.addResolutionAttachment(USER_A, resolution!.id, {
			url: "https://example.com/img.jpg",
			file_name: "img.jpg",
			path: "resolutions/img.jpg",
			base64: "base64data",
		});
		const sut = new GetResolutionsUseCase(repo);

		const result = await sut.execute({ complaintId: complaint.id });

		expect(result[0]?.attachments).toHaveLength(1);
		expect(result[0]?.attachments[0]?.url).toBe("https://example.com/img.jpg");
	});
});
