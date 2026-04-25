import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { GetComplaintsUseCase } from "./get-complaints-use-case.js";

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

describe("get-complaints-use-case", () => {
	it("lists complaints from a specific user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: "Lote com entulho",
				geospatial,
			},
		);

		await complaintsRepository.createForUser(
			"22222222-2222-2222-2222-222222222222",
			{
				date: new Date("2026-04-21T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result.length).toBe(1);
		expect(result[0]?.type).toBe("VACANT_LOT");
		expect(result[0]?.status).toBe("OPEN");
	});

	it("returns empty list when user has no complaints", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toStrictEqual([]);
	});
});
