import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type { UserSeed } from "../entities/user-seed.js";
import type { CityData, CityDataFile } from "./city-data-writer.js";
import { JsonCityDataWriter } from "./json-city-data-writer.js";

const CTX: CityContext = {
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
};

function makeUser(overrides?: Partial<UserSeed>): UserSeed {
	return {
		full_name: "Fulano de Tal",
		display_name: "Fulano",
		phone: "(65) 91234-5678",
		email: "fulano@oikos.seed",
		address: {
			zip_code: "78000-000",
			street: "Rua A",
			number: "1",
			complement: null,
			district: "Centro",
			city: "Rondonópolis",
			city_ibge_id: 5107602,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: -16.47,
			longitude: -54.63,
		},
		companies: [],
		complaints: [],
		...overrides,
	};
}

describe("json-city-data-writer", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "city-data-writer-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("writes users (with nested companies/complaints) into a single file for the city", () => {
		const writer = new JsonCityDataWriter(dir);
		const data: CityData = { users: [] };

		const result = writer.write(CTX, data, {
			generated_at: "2026-01-01T00:00:00.000Z",
		});

		expect(result.written).toBe(true);
		expect(result.path).toBe(join(dir, "rondonopolis-mt.json"));

		const parsed: CityDataFile = JSON.parse(readFileSync(result.path, "utf-8"));
		expect(parsed._meta).toStrictEqual({
			generated_at: "2026-01-01T00:00:00.000Z",
			city: "Rondonópolis",
			state_code: "MT",
			users_total: 0,
			companies_total: 0,
			complaints_total: 0,
		});
		expect(parsed.users).toStrictEqual([]);
	});

	it("sums companies_total/complaints_total from the nested arrays", () => {
		const writer = new JsonCityDataWriter(dir);
		const data: CityData = {
			users: [
				makeUser({ email: "a@oikos.seed" }), // sem empresas nem denúncias
				makeUser({
					email: "b@oikos.seed",
					companies: [{} as never, {} as never],
					complaints: [{} as never],
				}),
			],
		};

		const result = writer.write(CTX, data, {
			generated_at: "2026-01-01T00:00:00.000Z",
		});

		const parsed: CityDataFile = JSON.parse(readFileSync(result.path, "utf-8"));
		expect(parsed._meta.users_total).toBe(2);
		expect(parsed._meta.companies_total).toBe(2);
		expect(parsed._meta.complaints_total).toBe(1);
	});

	it("always overwrites an existing file — no exists check", () => {
		const writer = new JsonCityDataWriter(dir);
		const data: CityData = { users: [] };

		writer.write(CTX, data, { generated_at: "2026-01-01T00:00:00.000Z" });
		const second = writer.write(CTX, data, {
			generated_at: "2026-01-02T00:00:00.000Z",
		});

		expect(second.written).toBe(true);
		const parsed: CityDataFile = JSON.parse(readFileSync(second.path, "utf-8"));
		expect(parsed._meta.generated_at).toBe("2026-01-02T00:00:00.000Z");
	});
});
