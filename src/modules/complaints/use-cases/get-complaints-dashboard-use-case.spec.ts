import { describe, expect, it } from "vitest";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { GetComplaintsDashboardUseCase } from "./get-complaints-dashboard-use-case.js";

describe("get-complaints-dashboard-use-case", () => {
	it("returns summary grouped by status", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsDashboardUseCase(complaintsRepository);

		const complaint1 = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const _complaint2 = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-21T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		await complaintsRepository.updateStatusByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			complaint1.id,
			"RESOLVED",
		);

		const complaint3 = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-22T10:00:00.000Z"),
				waste_category_ids: ["waste-category-id"],
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		await complaintsRepository.updateStatusByUserAndComplaintId(
			"11111111-1111-1111-1111-111111111111",
			complaint3.id,
			"CANCELED",
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result.total).toBe(3);
		expect(result.open).toBe(1);
		expect(result.resolved).toBe(1);
		expect(result.canceled).toBe(1);
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
			resolved: 0,
			canceled: 0,
		});
	});
});
