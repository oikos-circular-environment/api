import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { GetPublicComplaintUseCase } from "./get-public-complaint-use-case.js";

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

const USER_A = "11111111-1111-1111-1111-111111111111";

describe("get-public-complaint-use-case", () => {
	it("returns the public complaint when it exists", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetPublicComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: "some obs", geospatial },
			"AUTOMATIC",
		);

		const result = await sut.execute({ complaintId: created.id });

		expect(result.id).toBe(created.id);
		expect(result.type).toBe("BURNING");
		expect(result.status).toBe("OPEN");
		expect(result.complaint_method).toBe("AUTOMATIC");
		expect(result.location).toBeNull();
		expect(result.captures).toHaveLength(1);
		expect(result.resolutions).toHaveLength(0);
		expect(result.vote_counts).toEqual({ resolved: 0, not_resolved: 0 });
	});

	it("throws AppError 404 when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetPublicComplaintUseCase(complaintsRepository);

		await expect(
			sut.execute({ complaintId: "00000000-0000-0000-0000-000000000000" }),
		).rejects.toThrowError(AppError);

		await expect(
			sut.execute({ complaintId: "00000000-0000-0000-0000-000000000000" }),
		).rejects.toMatchObject({ statusCode: 404, code: "COMPLAINT_NOT_FOUND" });
	});

	it("includes resolutions with anonymous resolver identity", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetPublicComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "VACANT_LOT", observations: null, geospatial },
			"AUTOMATIC",
		);

		complaintsRepository.resolutions.push({
			id: "res-1",
			complaint_id: created.id,
			resolver_user_id: USER_A,
			description: "Cleaned up",
			resolver: "City Hall",
			rating: 4,
			attachment_count: 2,
			created_at: new Date(),
		});

		const result = await sut.execute({ complaintId: created.id });

		expect(result.resolutions).toHaveLength(1);
		const resolution = result.resolutions[0];
		expect(resolution?.resolver_name).toBe("City Hall");
		expect(resolution?.rating).toBe(4);
		expect(resolution?.attachment_count).toBe(2);
		expect(resolution?.resolver).toMatchObject({
			type: "profile",
			full_name: "Anonymous",
			display_name: "Anonymous",
			avatar_url: null,
		});
	});
});
