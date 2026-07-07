import { describe, expect, it } from "vitest";
import { geospatialSchema } from "../../../src/modules/complaints/entities/complaint-entity.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import { SyntheticGeospatialGenerator } from "./synthetic-geospatial-generator.js";

function makeCtx(): CityContext {
	return {
		city: "Sinop",
		cityIbgeId: 5107909,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -11.95, longitude: -55.6 },
			high: { latitude: -11.75, longitude: -55.4 },
		},
		center: { latitude: -11.86, longitude: -55.5 },
	};
}

describe("synthetic-geospatial-generator", () => {
	it("generates a geospatial object valid against the real geospatialSchema", () => {
		const generator = new SyntheticGeospatialGenerator();

		for (let i = 0; i < 30; i++) {
			const geo = generator.generate(makeCtx());
			expect(geospatialSchema.safeParse(geo).success).toBe(true);
		}
	});

	it("keeps generated coordinates within the city bounds", () => {
		const ctx = makeCtx();
		const generator = new SyntheticGeospatialGenerator();

		for (let i = 0; i < 30; i++) {
			const geo = generator.generate(ctx);
			const { latitude, longitude } = geo.location.coords;
			expect(latitude).toBeGreaterThanOrEqual(ctx.bounds.low.latitude);
			expect(latitude).toBeLessThanOrEqual(ctx.bounds.high.latitude);
			expect(longitude).toBeGreaterThanOrEqual(ctx.bounds.low.longitude);
			expect(longitude).toBeLessThanOrEqual(ctx.bounds.high.longitude);
		}
	});

	it("keeps addresses.city/region consistent with the resolved CityContext", () => {
		const ctx = makeCtx();
		const geo = new SyntheticGeospatialGenerator().generate(ctx);

		expect(geo.addresses.city).toBe(ctx.city);
		expect(geo.addresses.region).toBe(ctx.stateCode);
		expect(geo.addresses.country).toBe("Brasil");
		expect(geo.addresses.isoCountryCode).toBe("BR");
	});
});
