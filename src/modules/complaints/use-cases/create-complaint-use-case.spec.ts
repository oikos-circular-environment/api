import { describe, expect, it } from "vitest";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { WASTE_CATEGORIES_SEED } from "@/modules/wastes/data/waste-categories-seed.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";

describe("create-complaint-use-case", () => {
	it("creates complaint with OPEN status for user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new CreateComplaintUseCase(complaintsRepository);

		const geo = makeGeospatial();
		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: "Fumaca intensa",
				geospatial: geo,
			},
		});

		expect(result.id.length > 0).toBe(true);
		expect(result.status).toBe("OPEN");
		expect(result.date).toEqual(new Date("2026-04-20T10:00:00.000Z"));
		expect(result.observations).toBe("Fumaca intensa");
		expect(result.geospatial).toStrictEqual(geo);
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
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: "Descarte irregular",
				geospatial: makeGeospatial({ heading: null }),
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
				waste_category_ids: [WASTE_CATEGORIES_SEED[0].id],
				observations: null,
				geospatial: makeGeospatial(),
			},
		});

		expect(result.observations).toBeNull();
	});
});
