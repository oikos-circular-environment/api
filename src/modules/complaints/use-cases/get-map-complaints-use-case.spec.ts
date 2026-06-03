import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { GetMapComplaintsUseCase } from "./get-map-complaints-use-case.js";

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

describe("get-map-complaints-use-case", () => {
	it("returns OPEN complaints by default when no status filter is provided", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
		);

		// manually set one to RESOLVED
		const resolved = complaintsRepository.complaints[1];
		if (resolved) resolved.status = "RESOLVED";

		const items = await sut.execute({ lat: -23.55, lon: -46.63, radius: 1000 });

		expect(items.length).toBe(1);
		expect(items[0]?.status).toBe("OPEN");
	});

	it("returns complaints matching the given type filter", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
		);

		const items = await sut.execute({
			lat: -23.55,
			lon: -46.63,
			radius: 1000,
			type: "BURNING",
		});

		expect(items.length).toBe(1);
		expect(items[0]?.type).toBe("BURNING");
	});

	it("filters by single status", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
		);

		const resolved = complaintsRepository.complaints[1];
		if (resolved) resolved.status = "RESOLVED";

		const items = await sut.execute({
			lat: -23.55,
			lon: -46.63,
			radius: 1000,
			status: "RESOLVED",
		});

		expect(items.length).toBe(1);
		expect(items[0]?.status).toBe("RESOLVED");
	});

	it("returns items with correct MapComplaintItem shape including attachments", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "VACANT_LOT", observations: null, geospatial },
		);

		const items = await sut.execute({ lat: -23.55, lon: -46.63, radius: 1000 });

		expect(items.length).toBe(1);
		const item = items[0];
		expect(item).toMatchObject({
			type: "VACANT_LOT",
			status: "OPEN",
			location: { lat: -23.55, lon: -46.63 },
			vote_counts: { resolved: 0, not_resolved: 0 },
			resolution_count: 0,
		});
		expect(item?.attachments).toHaveLength(0);
		expect(item?.geospatial).toBeDefined();
		expect(item?.id).toBeDefined();
		expect(item?.created_at).toBeInstanceOf(Date);
	});

	it("does not return complaints outside the radius", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		// complaint far away (~440 km from São Paulo)
		const farGeospatial: Geospatial = {
			...geospatial,
			location: {
				coords: { ...geospatial.location.coords, latitude: -19.92, longitude: -43.94 },
				timestamp: 1711111111111,
			},
		};
		await complaintsRepository.createForUser(USER_A, {
			date: new Date(),
			type: "BURNING",
			observations: null,
			geospatial: farGeospatial,
		});

		const items = await sut.execute({ lat: -23.55, lon: -46.63, radius: 1000 });

		expect(items).toHaveLength(0);
	});

	it("location is derived from capture coordinates", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);

		const items = await sut.execute({ lat: -23.55, lon: -46.63, radius: 1000 });

		expect(items[0]?.location).toEqual({ lat: -23.55, lon: -46.63 });
	});
});
