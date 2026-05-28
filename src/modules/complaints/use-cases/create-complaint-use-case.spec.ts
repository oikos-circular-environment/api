import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import type { JobDispatcher } from "../providers/job-dispatcher.js";
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

describe("create-complaint-use-case", () => {
	it("creates complaint with OPEN status and AUTOMATIC method for user", async () => {
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
		expect(result.complaint_method).toBe("AUTOMATIC");
		expect(result.captures).toHaveLength(1);
		expect(result.captures[0]?.observations).toBe("Fumaca intensa");
		expect(result.captures[0]?.geospatial).toStrictEqual(geospatial);
		expect(result.captures[0]?.attachments).toHaveLength(0);
		expect(result.vote_counts).toStrictEqual({ resolved: 0, not_resolved: 0 });
		expect(result.resolution_count).toBe(0);
	});

	it("dispatches grouping job after creation", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		let dispatchedId: string | null = null;
		const dispatcher: JobDispatcher = {
			dispatchGroupingJob: async (id) => {
				dispatchedId = id;
			},
			dispatchQuorumJob: async () => {},
		};
		const sut = new CreateComplaintUseCase(complaintsRepository, dispatcher);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: "Fumaca intensa",
				geospatial,
			},
		});

		expect(dispatchedId).toBe(result.id);
	});
});
