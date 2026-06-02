import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { GetComplaintsDashboardUseCase } from "./get-complaints-dashboard-use-case.js";

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

describe("get-complaints-dashboard-use-case", () => {
	it("returns summary grouped by status", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsDashboardUseCase(complaintsRepository);

		const openComplaint = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const pendingComplaint = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-21T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: null,
				geospatial,
			},
		);

		await complaintsRepository.updateStatusByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			pendingComplaint.id,
			"IN_PROGRESS",
		);

		await complaintsRepository.updateStatusByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			openComplaint.id,
			"RESOLVED",
		);

		const canceledComplaint = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-22T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		);

		await complaintsRepository.updateStatusByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			canceledComplaint.id,
			"CANCELED",
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result.total).toBe(3);
		expect(result.open).toBe(0);
		expect(result.pending).toBe(1);
		expect(result.resolved).toBe(1);
		expect(result.canceled).toBe(1);
		expect(result.rejected).toBe(0);
	});

	it("returns zeroes when user has no complaints", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsDashboardUseCase(complaintsRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toStrictEqual({
			total: 0,
			open: 0,
			pending: 0,
			resolved: 0,
			canceled: 0,
			rejected: 0,
		});
	});
});
