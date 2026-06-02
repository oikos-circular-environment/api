import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";

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

const geospatialNoHeading: Geospatial = {
	heading: null,
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
	},
};

describe("create-complaint-use-case", () => {
	it("creates complaint with OPEN status for user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: "Fumaca intensa",
				geospatial,
			},
		});

		expect(result.id.length > 0).toBe(true);
		expect(result.status).toBe("OPEN");
		expect(result.type).toBe("BURNING");
		expect(result.date).toEqual(new Date("2026-04-20T10:00:00.000Z"));
		expect(result.observations).toBe("Fumaca intensa");
		expect(result.geospatial).toStrictEqual(geospatial);
		expect(result.attachments).toHaveLength(0);
		expect(result.vote_counts).toStrictEqual({ resolved: 0, not_resolved: 0 });
		expect(result.resolution_count).toBe(0);
	});

	it("creates complaint without heading (manual address flow)", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "IRREGULAR_DISPOSAL",
				observations: "Descarte irregular",
				geospatial: geospatialNoHeading,
			},
		});

		expect(result.geospatial.heading).toBeNull();
		expect(result.observations).toBe("Descarte irregular");
	});

	it("stores null observations when not provided", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		});

		expect(result.observations).toBeNull();
	});
});
