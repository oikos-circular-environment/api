import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";

describe("get-complaints-map", () => {
	const createdComplaintIds: string[] = [];
	const createdUserIds: string[] = [];
	const createdWasteCategoryIds: string[] = [];

	const LAT = -23.5505;
	const LON = -46.6333;

	async function createUser(email?: string): Promise<{ id: string; email: string }> {
		const userId = randomUUID();
		const userEmail = email ?? `e2e-${userId}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			userId,
			userEmail,
		);
		createdUserIds.push(userId);
		return { id: userId, email: userEmail };
	}

	async function createComplaint(ownerId: string): Promise<string> {
		const c = await prisma.complaint.create({
			data: {
				id: randomUUID(),
				user_id: ownerId,
				status: "OPEN",
				date: new Date(),
				geospatial: makeGeospatial(),
			},
		});
		createdComplaintIds.push(c.id);
		return c.id;
	}

	async function insertComplaintWithLocation(
		ownerId: string,
		lat: number,
		lon: number,
		status: "OPEN" | "RESOLVED" | "CANCELED" = "OPEN",
	): Promise<string> {
		const id = randomUUID();
		const geo = makeGeospatial();
		geo.location.coords.latitude = lat;
		geo.location.coords.longitude = lon;

		await prisma.$executeRawUnsafe(
			`INSERT INTO complaints (id, user_id, status, date, geospatial, created_at, location)
       VALUES ($1, $2, $3::"ComplaintStatus", NOW(), $4::jsonb, NOW(),
               ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)`,
			id,
			ownerId,
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

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

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

	it("200 — public route, no auth required, returns array", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints/map?lat=-23.5505&lon=-46.6333",
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaints).toBeInstanceOf(Array);
	});

	it("200 — accepts lat/lon/radius parameters", async () => {
		const user = await createUser();
		await createComplaint(user.id);

		const res = await app.inject({
			method: "GET",
			url: "/v1/complaints/map?lat=-23.5505&lon=-46.6333&radius=5000",
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.complaints).toBeInstanceOf(Array);
	});

	it("200 — filters by waste_category_id", async () => {
		const user = await createUser();
		const wasteCategoryId = await createWasteCategory(["LOW"]);
		const complaintId = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(complaintId, wasteCategoryId);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&waste_category_id=${wasteCategoryId}`,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const ids = body.complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(complaintId);
	});

	it("200 — excludes complaints from other categories when filtering by waste_category_id", async () => {
		const user = await createUser();
		const targetCategoryId = await createWasteCategory(["LOW"]);
		const otherCategoryId = await createWasteCategory(["HIGH"]);
		const matchingId = await insertComplaintWithLocation(user.id, LAT, LON);
		const otherComplaintId = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(matchingId, targetCategoryId);
		await linkComplaintToWasteCategory(otherComplaintId, otherCategoryId);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&waste_category_id=${targetCategoryId}`,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const ids = body.complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(matchingId);
		expect(ids).not.toContain(otherComplaintId);
	});

	it("200 — filters by hazard_level", async () => {
		const user = await createUser();
		const wasteCategoryId = await createWasteCategory(["VERY_HIGH"]);
		const complaintId = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(complaintId, wasteCategoryId);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&hazard_level=VERY_HIGH`,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const ids = body.complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(complaintId);
	});

	it("200 — excludes complaints whose category does not match hazard_level", async () => {
		const user = await createUser();
		const veryHighCategoryId = await createWasteCategory(["VERY_HIGH"]);
		const lowCategoryId = await createWasteCategory(["LOW"]);
		const matchingId = await insertComplaintWithLocation(user.id, LAT, LON);
		const excludedId = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(matchingId, veryHighCategoryId);
		await linkComplaintToWasteCategory(excludedId, lowCategoryId);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&hazard_level=VERY_HIGH`,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const ids = body.complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(matchingId);
		expect(ids).not.toContain(excludedId);
	});

	it("200 — status=ALL returns both OPEN and RESOLVED complaints", async () => {
		const user = await createUser();
		const openId = await insertComplaintWithLocation(user.id, LAT, LON, "OPEN");
		const resolvedId = await insertComplaintWithLocation(user.id, LAT, LON, "RESOLVED");
		const canceledId = await insertComplaintWithLocation(user.id, LAT, LON, "CANCELED");

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&status=ALL`,
		});

		expect(res.statusCode).toBe(200);
		const ids = res.json().complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(openId);
		expect(ids).toContain(resolvedId);
		expect(ids).not.toContain(canceledId);
	});

	it("200 — omitting status defaults to ALL (returns OPEN and RESOLVED)", async () => {
		const user = await createUser();
		const openId = await insertComplaintWithLocation(user.id, LAT, LON, "OPEN");
		const resolvedId = await insertComplaintWithLocation(user.id, LAT, LON, "RESOLVED");

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500`,
		});

		expect(res.statusCode).toBe(200);
		const ids = res.json().complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(openId);
		expect(ids).toContain(resolvedId);
	});

	it("200 — status=OPEN returns only OPEN complaints", async () => {
		const user = await createUser();
		const openId = await insertComplaintWithLocation(user.id, LAT, LON, "OPEN");
		const resolvedId = await insertComplaintWithLocation(user.id, LAT, LON, "RESOLVED");

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&status=OPEN`,
		});

		expect(res.statusCode).toBe(200);
		const ids = res.json().complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(openId);
		expect(ids).not.toContain(resolvedId);
	});

	it("200 — waste_category_id=ALL returns complaints from all categories", async () => {
		const user = await createUser();
		const cat1 = await createWasteCategory(["LOW"]);
		const cat2 = await createWasteCategory(["HIGH"]);
		const id1 = await insertComplaintWithLocation(user.id, LAT, LON);
		const id2 = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(id1, cat1);
		await linkComplaintToWasteCategory(id2, cat2);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&waste_category_id=ALL`,
		});

		expect(res.statusCode).toBe(200);
		const ids = res.json().complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(id1);
		expect(ids).toContain(id2);
	});

	it("200 — hazard_level=ALL returns complaints from all hazard levels", async () => {
		const user = await createUser();
		const lowCat = await createWasteCategory(["LOW"]);
		const highCat = await createWasteCategory(["VERY_HIGH"]);
		const id1 = await insertComplaintWithLocation(user.id, LAT, LON);
		const id2 = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(id1, lowCat);
		await linkComplaintToWasteCategory(id2, highCat);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&hazard_level=ALL`,
		});

		expect(res.statusCode).toBe(200);
		const ids = res.json().complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(id1);
		expect(ids).toContain(id2);
	});

	it("200 — filters by waste_category_id and hazard_level combined", async () => {
		const user = await createUser();
		const wasteCategoryId = await createWasteCategory(["VERY_HIGH"]);
		const complaintId = await insertComplaintWithLocation(user.id, LAT, LON);
		await linkComplaintToWasteCategory(complaintId, wasteCategoryId);

		const res = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${LAT}&lon=${LON}&radius=500&waste_category_id=${wasteCategoryId}&hazard_level=VERY_HIGH`,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const ids = body.complaints.map((c: { id: string }) => c.id);
		expect(ids).toContain(complaintId);
	});
});
