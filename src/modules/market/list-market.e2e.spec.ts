import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";

describe("list-market", () => {
	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	// ─── GET /v1/market ──────────────────────────────────────────────────────

	describe("GET /v1/market", () => {
		it("200 — returns empty companies array and null next_cursor when no companies in area", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/v1/market?lat=-23.5505&lon=-46.6333&radius=10",
			});

			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(Array.isArray(body.companies)).toBe(true);
			expect(body.next_cursor).toBeNull();
		});

		it("400 — missing lat rejected by schema validation", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/v1/market?lon=-46.6333",
			});

			expect(res.statusCode).toBe(400);
		});

		it("400 — missing lon rejected by schema validation", async () => {
			const res = await app.inject({
				method: "GET",
				url: "/v1/market?lat=-23.5505",
			});

			expect(res.statusCode).toBe(400);
		});
	});
});
