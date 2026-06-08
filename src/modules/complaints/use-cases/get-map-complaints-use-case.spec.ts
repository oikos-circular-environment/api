import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { GetMapComplaintsUseCase } from "./get-map-complaints-use-case.js";

const USER_A = "11111111-1111-1111-1111-111111111111";

// Sao Paulo coordinates used for radius-based assertions
const spCoords = { latitude: -23.55, longitude: -46.63 };

function makeSpGeospatial(overrides?: Partial<Geospatial>): Geospatial {
	return makeGeospatial({
		location: {
			coords: {
				...makeGeospatial().location.coords,
				...spCoords,
			},
			timestamp: Date.now(),
		},
		...overrides,
	});
}

describe("get-map-complaints-use-case", () => {
	it("returns OPEN complaints by default when no status filter is provided", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetMapComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeSpGeospatial() },
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial: makeSpGeospatial() },
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
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeSpGeospatial() },
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial: makeSpGeospatial() },
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
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeSpGeospatial() },
		);
		await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "DEFORESTATION", observations: null, geospatial: makeSpGeospatial() },
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
			{ date: new Date(), type: "VACANT_LOT", observations: null, geospatial: makeSpGeospatial() },
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
		const farGeospatial = makeGeospatial({
			location: {
				coords: {
					...makeGeospatial().location.coords,
					latitude: -19.92,
					longitude: -43.94,
				},
				timestamp: Date.now(),
			},
		});
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
			{ date: new Date(), type: "BURNING", observations: null, geospatial: makeSpGeospatial() },
		);

		const items = await sut.execute({ lat: -23.55, lon: -46.63, radius: 1000 });

		expect(items[0]?.location).toEqual({ lat: -23.55, lon: -46.63 });
	});
});
