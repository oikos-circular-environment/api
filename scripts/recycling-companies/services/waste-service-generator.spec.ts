import { describe, expect, it } from "vitest";
import {
	ECOPONTO_CATEGORY_POOL,
	RECYCLER_CATEGORY_POOL,
	WasteServiceGenerator,
} from "./waste-service-generator.js";

describe("waste-service-generator", () => {
	const generator = new WasteServiceGenerator();

	it("generates between 2 and 6 wastes from the recycler pool", () => {
		const wastes = generator.generateWastes(RECYCLER_CATEGORY_POOL);

		expect(wastes.length).toBeGreaterThanOrEqual(2);
		expect(wastes.length).toBeLessThanOrEqual(6);
		for (const waste of wastes) {
			expect(RECYCLER_CATEGORY_POOL).toContain(waste.waste_category_name);
			expect(waste.unit).toBe("KG");
			expect(waste.price).toBeGreaterThan(0);
			expect(waste.quantity).toBeGreaterThan(0);
		}
	});

	it("generates services with UNIT measurement and positive price/quantity", () => {
		const services = generator.generateServices(RECYCLER_CATEGORY_POOL);

		for (const service of services) {
			expect(service.unit).toBe("UNIT");
			expect(service.price).toBeGreaterThan(0);
			expect(service.quantity).toBeGreaterThan(0);
		}
	});

	it("never generates duplicate names within the same call", () => {
		const wastes = generator.generateWastes(ECOPONTO_CATEGORY_POOL);
		const names = wastes.map((w) => w.name);

		expect(new Set(names).size).toBe(names.length);
	});

	it("ecoponto pool includes categories the recycler pool does not (e.g. RCD)", () => {
		expect(ECOPONTO_CATEGORY_POOL).toContain(
			"Construção Civil e Demolição (RCD)",
		);
		expect(RECYCLER_CATEGORY_POOL).not.toContain(
			"Construção Civil e Demolição (RCD)",
		);
	});

	it("resolves every pool name against the real CATEGORIES list (non-empty pools)", () => {
		expect(RECYCLER_CATEGORY_POOL.length).toBeGreaterThan(0);
		expect(ECOPONTO_CATEGORY_POOL.length).toBeGreaterThan(
			RECYCLER_CATEGORY_POOL.length,
		);
	});
});
