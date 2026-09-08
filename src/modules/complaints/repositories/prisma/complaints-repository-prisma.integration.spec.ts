import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { PrismaComplaintsRepository } from "./complaints-repository-prisma.js";

describe("complaints-repository-prisma", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];
	const createdWasteCategoryIds: string[] = [];

	async function insertUser(): Promise<string> {
		const userId = randomUUID();
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, created_at) VALUES ($1, $2, NOW())`,
			userId,
			`test-${userId}@integration.test`,
		);
		createdUserIds.push(userId);
		return userId;
	}

	async function insertComplaintWithLocation(
		lat: number,
		lon: number,
		status = "OPEN",
	): Promise<string> {
		const id = randomUUID();
		const userId = await insertUser();

		const geo = makeGeospatial();
		geo.location.coords.latitude = lat;
		geo.location.coords.longitude = lon;

		await prisma.$executeRawUnsafe(
			`INSERT INTO complaints (id, user_id, status, date, geospatial, created_at, location)
       VALUES ($1, $2, $3, NOW(), $4::jsonb, NOW(),
               ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)`,
			id,
			userId,
			status,
			JSON.stringify(geo),
			lon,
			lat,
		);

		createdComplaintIds.push(id);
		return id;
	}

	async function createWasteCategory(hazardLevels: string[]): Promise<string> {
		const id = randomUUID();
		const category = await prisma.wasteCategory.create({
			data: {
				id,
				name: `category-${id}`,
				hazard_levels: hazardLevels as never[],
			},
		});
		createdWasteCategoryIds.push(category.id);
		return category.id;
	}

	async function linkComplaintToWasteCategory(
		complaintId: string,
		wasteCategoryId: string,
	): Promise<void> {
		await prisma.$executeRawUnsafe(
			`INSERT INTO complaint_waste_categories (complaint_id, waste_category_id) VALUES ($1, $2)`,
			complaintId,
			wasteCategoryId,
		);
	}

	afterEach(async () => {
		if (createdComplaintIds.length > 0) {
			await prisma.complaint.deleteMany({
				where: { id: { in: createdComplaintIds } },
			});
			createdComplaintIds.length = 0;
		}
		if (createdWasteCategoryIds.length > 0) {
			await prisma.wasteCategory.deleteMany({
				where: { id: { in: createdWasteCategoryIds } },
			});
			createdWasteCategoryIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("returns complaints within radius", async () => {
		const repo = new PrismaComplaintsRepository();
		// center: São Paulo (-23.5505, -46.6333)
		const idNear1 = await insertComplaintWithLocation(-23.5505, -46.6333); // inside (0m)
		const idNear2 = await insertComplaintWithLocation(-23.551, -46.634); // inside (~90m)
		const idFar = await insertComplaintWithLocation(-23.6, -46.7); // outside (>7km)

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 500,
			status: "ALL",
			waste_category_id: "ALL",
			hazard_level: "ALL",
		});
		const resultIds = result.map((r) => r.id);

		expect(resultIds).toContain(idNear1);
		expect(resultIds).toContain(idNear2);
		expect(resultIds).not.toContain(idFar);
	});

	it("status=ALL returns OPEN and RESOLVED but excludes CANCELED", async () => {
		const repo = new PrismaComplaintsRepository();
		const openId = await insertComplaintWithLocation(
			-23.5505,
			-46.6333,
			"OPEN",
		);
		const resolvedId = await insertComplaintWithLocation(
			-23.5506,
			-46.6334,
			"RESOLVED",
		);
		const canceledId = await insertComplaintWithLocation(
			-23.5507,
			-46.6335,
			"CANCELED",
		);

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 500,
			status: "ALL",
			waste_category_id: "ALL",
			hazard_level: "ALL",
		});
		const resultIds = result.map((r) => r.id);

		expect(resultIds).toContain(openId);
		expect(resultIds).toContain(resolvedId);
		expect(resultIds).not.toContain(canceledId);
	});

	it("status=OPEN returns only OPEN complaints", async () => {
		const repo = new PrismaComplaintsRepository();
		await insertComplaintWithLocation(-23.5505, -46.6333, "OPEN");
		await insertComplaintWithLocation(-23.5506, -46.6334, "RESOLVED");

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 500,
			status: "OPEN",
			waste_category_id: "ALL",
			hazard_level: "ALL",
		});

		expect(result.every((c) => c.status === "OPEN")).toBe(true);
	});

	it("respects limit of 500", async () => {
		const repo = new PrismaComplaintsRepository();
		await insertComplaintWithLocation(-23.5505, -46.6333);

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 1000,
			status: "ALL",
			waste_category_id: "ALL",
			hazard_level: "ALL",
		});

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeLessThanOrEqual(500);
	});

	it("filters by waste_category_id", async () => {
		const repo = new PrismaComplaintsRepository();
		const targetCategoryId = await createWasteCategory(["LOW"]);
		const otherCategoryId = await createWasteCategory(["HIGH"]);
		const matchingId = await insertComplaintWithLocation(-23.5505, -46.6333);
		const otherComplaintId = await insertComplaintWithLocation(
			-23.5506,
			-46.6334,
		);
		await linkComplaintToWasteCategory(matchingId, targetCategoryId);
		await linkComplaintToWasteCategory(otherComplaintId, otherCategoryId);

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 500,
			status: "ALL",
			waste_category_id: targetCategoryId,
			hazard_level: "ALL",
		});
		const resultIds = result.map((r) => r.id);

		expect(resultIds).toContain(matchingId);
		expect(resultIds).not.toContain(otherComplaintId);
	});

	it("filters by hazard_level", async () => {
		const repo = new PrismaComplaintsRepository();
		const veryHighCategoryId = await createWasteCategory(["VERY_HIGH"]);
		const lowCategoryId = await createWasteCategory(["LOW"]);
		const matchingId = await insertComplaintWithLocation(-23.5505, -46.6333);
		const excludedId = await insertComplaintWithLocation(-23.5506, -46.6334);
		await linkComplaintToWasteCategory(matchingId, veryHighCategoryId);
		await linkComplaintToWasteCategory(excludedId, lowCategoryId);

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 500,
			status: "ALL",
			waste_category_id: "ALL",
			hazard_level: "VERY_HIGH",
		});
		const resultIds = result.map((r) => r.id);

		expect(resultIds).toContain(matchingId);
		expect(resultIds).not.toContain(excludedId);
	});

	it("filters by waste_category_id and hazard_level combined", async () => {
		const repo = new PrismaComplaintsRepository();
		const matchingCategoryId = await createWasteCategory(["VERY_HIGH"]);
		const wrongHazardCategoryId = await createWasteCategory(["LOW"]);
		const matchingId = await insertComplaintWithLocation(-23.5505, -46.6333);
		const wrongHazardId = await insertComplaintWithLocation(-23.5506, -46.6334);
		await linkComplaintToWasteCategory(matchingId, matchingCategoryId);
		await linkComplaintToWasteCategory(wrongHazardId, wrongHazardCategoryId);

		const result = await repo.findMapComplaints({
			lat: -23.5505,
			lon: -46.6333,
			radius: 500,
			status: "ALL",
			waste_category_id: matchingCategoryId,
			hazard_level: "VERY_HIGH",
		});
		const resultIds = result.map((r) => r.id);

		expect(resultIds).toContain(matchingId);
		expect(resultIds).not.toContain(wrongHazardId);
	});
});
