import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("list-waste-categories", () => {
	const createdCategoryIds: string[] = [];

	async function createWasteCategory(name?: string) {
		const id = randomUUID();
		const categoryName = name ?? `E2E Category ${id}`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO waste_categories (id, name, hazard_levels, created_at, updated_at) VALUES ($1, $2, '{}', NOW(), NOW())`,
			id,
			categoryName,
		);
		createdCategoryIds.push(id);
		return { id, name: categoryName };
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdCategoryIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM waste_categories WHERE id IN (${createdCategoryIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdCategoryIds,
			);
			createdCategoryIds.length = 0;
		}
	});

	// ─── GET /v1/waste-categories ────────────────────────────────────────────

	describe("GET /v1/waste-categories", () => {
		it("200 — returns categories array", async () => {
			await createWasteCategory();

			const res = await app.inject({
				method: "GET",
				url: "/v1/waste-categories",
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(Array.isArray(body.categories)).toBe(true);
			expect(body.categories.length).toBeGreaterThanOrEqual(1);
		});
	});

	// ─── GET /v1/waste-categories/:id ───────────────────────────────────────

	describe("GET /v1/waste-categories/:id", () => {
		it("200 — returns existing category by id", async () => {
			const category = await createWasteCategory();

			const res = await app.inject({
				method: "GET",
				url: `/v1/waste-categories/${category.id}`,
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(body.category.id).toBe(category.id);
			expect(body.category.name).toBe(category.name);
		});

		it("404 — nonexistent id returns WASTE_CATEGORY_NOT_FOUND", async () => {
			const res = await app.inject({
				method: "GET",
				url: `/v1/waste-categories/${randomUUID()}`,
			});

			expect(res.statusCode).toBe(404);
			expect(res.json().code).toBe("WASTE_CATEGORY_NOT_FOUND");
		});
	});
});
