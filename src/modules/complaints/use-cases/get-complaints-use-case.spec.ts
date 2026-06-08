import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { GetComplaintsUseCase } from "./get-complaints-use-case.js";

describe("get-complaints-use-case", () => {
	it("lists complaints from a specific user", async () => {
		const userAId = randomUUID();
		const userBId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: "Lote com entulho",
				geospatial: makeGeospatial(),
			},
		);

		await complaintsRepository.createForUser(
			userBId,
			{
				date: new Date("2026-04-21T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const { complaints } = await sut.execute({ userId: userAId, limit: 20 });

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.type).toBe("VACANT_LOT");
		expect(complaints[0]?.status).toBe("OPEN");
	});

	it("returns empty list when user has no complaints", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		const { complaints, next_cursor } = await sut.execute({
			userId: userAId,
			limit: 20,
		});

		expect(complaints).toStrictEqual([]);
		expect(next_cursor).toBeNull();
	});

	it("returns first page with next_cursor when there are more items", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		for (let i = 0; i < 5; i++) {
			await complaintsRepository.createForUser(
				userAId,
				{
					date: new Date("2026-04-01T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial: makeGeospatial(),
				},
			);
		}

		complaintsRepository.complaints.forEach((c, i) => {
			c.created_at = new Date(2026, 3, 20 - i);
		});

		const { complaints, next_cursor } = await sut.execute({
			userId: userAId,
			limit: 3,
		});

		expect(complaints.length).toBe(3);
		expect(next_cursor).not.toBeNull();
	});

	it("returns last page with next_cursor null", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		for (let i = 0; i < 3; i++) {
			await complaintsRepository.createForUser(
				userAId,
				{
					date: new Date("2026-04-01T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial: makeGeospatial(),
				},
			);
		}

		complaintsRepository.complaints.forEach((c, i) => {
			c.created_at = new Date(2026, 3, 20 - i);
		});

		const { complaints, next_cursor } = await sut.execute({
			userId: userAId,
			limit: 3,
		});

		expect(complaints.length).toBe(3);
		expect(next_cursor).toBeNull();
	});

	it("second page returns remaining items using cursor", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		for (let i = 0; i < 5; i++) {
			await complaintsRepository.createForUser(
				userAId,
				{
					date: new Date("2026-04-01T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial: makeGeospatial(),
				},
			);
		}

		// garante created_at distintos e ordenados de forma decrescente
		complaintsRepository.complaints.forEach((c, i) => {
			c.created_at = new Date(2026, 3, 20 - i);
		});

		const firstPage = await sut.execute({ userId: userAId, limit: 3 });
		expect(firstPage.complaints.length).toBe(3);
		expect(firstPage.next_cursor).not.toBeNull();

		const secondPage = await sut.execute({
			userId: userAId,
			limit: 3,
			cursor: new Date(firstPage.next_cursor!),
		});

		expect(secondPage.complaints.length).toBe(2);
		expect(secondPage.next_cursor).toBeNull();

		const allIds = [
			...firstPage.complaints.map((c) => c.id),
			...secondPage.complaints.map((c) => c.id),
		];
		expect(new Set(allIds).size).toBe(5);
	});

	it("filters by type", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);
		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-02T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const { complaints } = await sut.execute({
			userId: userAId,
			filters: { type: "BURNING" },
			limit: 20,
		});

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.type).toBe("BURNING");
	});

	it("filters by status", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		const c1 = await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(
			userAId,
			c1.id,
			"RESOLVED",
		);

		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-02T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const { complaints } = await sut.execute({
			userId: userAId,
			filters: { status: "OPEN" },
			limit: 20,
		});

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.status).toBe("OPEN");
	});

	it("filters by type and status combined", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const c2 = await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-02T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(
			userAId,
			c2.id,
			"RESOLVED",
		);

		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-03T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const { complaints } = await sut.execute({
			userId: userAId,
			filters: { type: "BURNING", status: "OPEN" },
			limit: 20,
		});

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.type).toBe("BURNING");
		expect(complaints[0]?.status).toBe("OPEN");
	});

	it("returns empty list when filter has no match", async () => {
		const userAId = randomUUID();
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			userAId,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial: makeGeospatial(),
			},
		);

		const { complaints, next_cursor } = await sut.execute({
			userId: userAId,
			filters: { type: "DEFORESTATION" },
			limit: 20,
		});

		expect(complaints).toStrictEqual([]);
		expect(next_cursor).toBeNull();
	});
});
