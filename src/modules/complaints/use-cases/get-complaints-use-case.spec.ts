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

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

describe("get-complaints-use-case", () => {
	it("lists complaints from a specific user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "VACANT_LOT",
				observations: "Lote com entulho",
				geospatial,
			},
		);

		await complaintsRepository.createForUser(
			USER_B,
			{
				date: new Date("2026-04-21T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		);

		const { complaints } = await sut.execute({ userId: USER_A, limit: 20 });

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.type).toBe("VACANT_LOT");
		expect(complaints[0]?.status).toBe("OPEN");
	});

	it("returns empty list when user has no complaints", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		const { complaints, next_cursor } = await sut.execute({
			userId: USER_A,
			limit: 20,
		});

		expect(complaints).toStrictEqual([]);
		expect(next_cursor).toBeNull();
	});

	it("returns first page with next_cursor when there are more items", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		for (let i = 0; i < 5; i++) {
			await complaintsRepository.createForUser(
				USER_A,
				{
					date: new Date("2026-04-01T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial,
				},
			);
		}

		complaintsRepository.complaints.forEach((c, i) => {
			c.created_at = new Date(2026, 3, 20 - i);
		});

		const { complaints, next_cursor } = await sut.execute({
			userId: USER_A,
			limit: 3,
		});

		expect(complaints.length).toBe(3);
		expect(next_cursor).not.toBeNull();
	});

	it("returns last page with next_cursor null", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		for (let i = 0; i < 3; i++) {
			await complaintsRepository.createForUser(
				USER_A,
				{
					date: new Date("2026-04-01T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial,
				},
			);
		}

		complaintsRepository.complaints.forEach((c, i) => {
			c.created_at = new Date(2026, 3, 20 - i);
		});

		const { complaints, next_cursor } = await sut.execute({
			userId: USER_A,
			limit: 3,
		});

		expect(complaints.length).toBe(3);
		expect(next_cursor).toBeNull();
	});

	it("second page returns remaining items using cursor", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		for (let i = 0; i < 5; i++) {
			await complaintsRepository.createForUser(
				USER_A,
				{
					date: new Date("2026-04-01T10:00:00.000Z"),
					type: "BURNING",
					observations: null,
					geospatial,
				},
			);
		}

		// garante created_at distintos e ordenados de forma decrescente
		complaintsRepository.complaints.forEach((c, i) => {
			c.created_at = new Date(2026, 3, 20 - i);
		});

		const firstPage = await sut.execute({ userId: USER_A, limit: 3 });
		expect(firstPage.complaints.length).toBe(3);
		expect(firstPage.next_cursor).not.toBeNull();

		const secondPage = await sut.execute({
			userId: USER_A,
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
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);
		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-02T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		);

		const { complaints } = await sut.execute({
			userId: USER_A,
			filters: { type: "BURNING" },
			limit: 20,
		});

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.type).toBe("BURNING");
	});

	it("filters by status", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		const c1 = await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(
			USER_A,
			c1.id,
			"RESOLVED",
		);

		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-02T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		);

		const { complaints } = await sut.execute({
			userId: USER_A,
			filters: { status: "OPEN" },
			limit: 20,
		});

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.status).toBe("OPEN");
	});

	it("filters by type and status combined", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const c2 = await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-02T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(
			USER_A,
			c2.id,
			"RESOLVED",
		);

		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-03T10:00:00.000Z"),
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		);

		const { complaints } = await sut.execute({
			userId: USER_A,
			filters: { type: "BURNING", status: "OPEN" },
			limit: 20,
		});

		expect(complaints.length).toBe(1);
		expect(complaints[0]?.type).toBe("BURNING");
		expect(complaints[0]?.status).toBe("OPEN");
	});

	it("returns empty list when filter has no match", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetComplaintsUseCase(complaintsRepository);

		await complaintsRepository.createForUser(
			USER_A,
			{
				date: new Date("2026-04-01T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const { complaints, next_cursor } = await sut.execute({
			userId: USER_A,
			filters: { type: "DEFORESTATION" },
			limit: 20,
		});

		expect(complaints).toStrictEqual([]);
		expect(next_cursor).toBeNull();
	});
});
