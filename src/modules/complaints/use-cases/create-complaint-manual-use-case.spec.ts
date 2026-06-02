import { describe, expect, it } from "vitest";
import type { GeospatialManual } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { CreateComplaintManualUseCase } from "./create-complaint-manual-use-case.js";

const geospatialManual: GeospatialManual = {
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
		postalCode: "01000-000",
		region: "SP",
		subregion: null,
		country: "Brasil",
		name: null,
		isoCountryCode: "BR",
		timezone: "America/Sao_Paulo",
	},
};

describe("create-complaint-manual-use-case", () => {
	it("creates complaint with OPEN status and MANUAL method for user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintManualUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "IRREGULAR_DISPOSAL",
				observations: "Descarte irregular na rua",
				geospatial: geospatialManual,
			},
		});

		expect(result.id.length > 0).toBe(true);
		expect(result.status).toBe("OPEN");
		expect(result.complaint_method).toBe("MANUAL");
		expect(result.captures).toHaveLength(1);
	});

	it("stores observations in complaint and sets capture.observations to null for MANUAL", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintManualUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "IRREGULAR_DISPOSAL",
				observations: "Descarte irregular na rua",
				geospatial: geospatialManual,
			},
		});

		expect(result.observations).toBe("Descarte irregular na rua");
		expect(result.captures[0]?.observations).toBeNull();
	});

	it("sets both observations to null for MANUAL when observations is not provided", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintManualUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial: geospatialManual,
			},
		});

		expect(result.observations).toBeNull();
		expect(result.captures[0]?.observations).toBeNull();
	});

	it("stores null heading in the capture geospatial", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintManualUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "IRREGULAR_DISPOSAL",
				observations: null,
				geospatial: geospatialManual,
			},
		});

		expect(result.captures[0]?.geospatial.heading).toBeNull();
	});

	it("stores address city in the capture geospatial", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintManualUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "IRREGULAR_DISPOSAL",
				observations: null,
				geospatial: geospatialManual,
			},
		});

		expect(result.captures[0]?.geospatial.addresses.city).toBe("Sao Paulo");
	});

	it("does not call jobDispatcher when none is injected", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintManualUseCase(complaintsRepository);

		await expect(
			sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				data: {
					date: new Date("2026-04-20T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial: geospatialManual,
				},
			}),
		).resolves.not.toThrow();
	});

});
