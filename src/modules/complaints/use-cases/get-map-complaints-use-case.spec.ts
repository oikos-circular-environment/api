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
			"AUTOMATIC",
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
			"AUTOMATIC",
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
			"AUTOMATIC",
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
			"AUTOMATIC",
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

	it("returns complaints matching multiple statuses", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
			"AUTOMATIC",
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
			"AUTOMATIC",
		);

		const resolved = complaintsRepository.complaints[1];
		if (resolved) resolved.status = "RESOLVED";

		const items = await sut.execute({
			lat: -23.55,
			lon: -46.63,
			radius: 1000,
			status: ["OPEN", "RESOLVED"],
		});

		expect(items.length).toBe(2);
	});

	it("returns items with correct MapComplaintItem shape", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "VACANT_LOT", observations: null, geospatial },
			"AUTOMATIC",
		);

		const items = await sut.execute({ lat: -23.55, lon: -46.63, radius: 1000 });

		expect(items.length).toBe(1);
		const item = items[0];
		expect(item).toMatchObject({
			type: "VACANT_LOT",
			status: "OPEN",
			event_group_id: null,
			location: null,
			vote_counts: { resolved: 0, not_resolved: 0 },
			resolution_count: 0,
			capture_count: 1,
		});
		expect(item?.id).toBeDefined();
		expect(item?.created_at).toBeInstanceOf(Date);
	});

	it("filters by from/to date range", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
			"AUTOMATIC",
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial },
			"AUTOMATIC",
		);

		// Set distinct created_at dates
		const [c1, c2] = complaintsRepository.complaints;
		if (c1) c1.created_at = new Date("2026-01-01T10:00:00.000Z");
		if (c2) c2.created_at = new Date("2026-03-01T10:00:00.000Z");

		const items = await sut.execute({
			lat: -23.55,
			lon: -46.63,
			radius: 1000,
			status: ["OPEN"],
			from: "2026-02-01T00:00:00.000Z",
		});

		expect(items.length).toBe(1);
		expect(items[0]?.type).toBe("DEFORESTATION");
	});
});
