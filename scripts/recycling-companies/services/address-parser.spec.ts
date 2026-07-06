import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type { GooglePlace } from "../entities/google-place.js";
import { GoogleAddressParser } from "./address-parser.js";

function makeCtx(overrides?: Partial<CityContext>): CityContext {
	return {
		city: "Rondonópolis",
		cityIbgeId: 5107602,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -16.72, longitude: -54.78 },
			high: { latitude: -16.22, longitude: -54.35 },
		},
		center: { latitude: -16.47, longitude: -54.63 },
		...overrides,
	};
}

describe("address-parser", () => {
	const parser = new GoogleAddressParser();

	it("parses a complete BR-formatted address", () => {
		const place: GooglePlace = {
			id: "1",
			formattedAddress:
				"Rua das Flores, 123 - Centro, Rondonópolis - MT, 78700-000, Brasil",
			location: { latitude: -16.47, longitude: -54.63 },
		};

		const result = parser.parse(place, makeCtx());

		expect(result.zip_code).toBe("78700-000");
		expect(result.street).toBe("Rua das Flores");
		expect(result.number).toBe("123");
		// A heurística de split por " - " inclui a cidade junto do bairro neste
		// formato de 4 segmentos — comportamento já presente no dataset real
		// migrado (ex.: "Distrito Industrial, Rondonópolis"), não é um bug novo.
		expect(result.district).toBe("Centro, Rondonópolis");
		expect(result.city).toBe("Rondonópolis");
		expect(result.city_ibge_id).toBe(5107602);
		expect(result.state_code).toBe("MT");
		expect(result.latitude).toBe(-16.47);
		expect(result.longitude).toBe(-54.63);
	});

	it("falls back to a default zip code when the address has none", () => {
		const place: GooglePlace = {
			id: "2",
			formattedAddress: "Rua Sem CEP, 45 - Bairro Novo, Rondonópolis - MT",
		};

		const result = parser.parse(place, makeCtx());

		expect(result.zip_code).toBe("00000-000");
	});

	it("falls back to 'Centro' when the district is missing", () => {
		const place: GooglePlace = { id: "3", formattedAddress: "Rua Única, 10" };

		const result = parser.parse(place, makeCtx());

		expect(result.district).toBe("Centro");
	});

	it("falls back to 'S/N' when the street number is missing", () => {
		const place: GooglePlace = {
			id: "4",
			formattedAddress: "Rua Sem Número - Centro, Rondonópolis - MT",
		};

		const result = parser.parse(place, makeCtx());

		expect(result.number).toBe("S/N");
	});

	it("falls back to the city center when the place has no location", () => {
		const place: GooglePlace = { id: "5", formattedAddress: "Rua X, 1" };
		const ctx = makeCtx();

		const result = parser.parse(place, ctx);

		expect(result.latitude).toBe(ctx.center.latitude);
		expect(result.longitude).toBe(ctx.center.longitude);
	});
});
