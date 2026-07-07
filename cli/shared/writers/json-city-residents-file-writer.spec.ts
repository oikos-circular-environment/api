import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type { CityResidentSeed } from "../entities/city-resident.js";
import { citySlug } from "../services/city-slug.js";
import { JsonCityResidentsFileWriter } from "./json-city-residents-file-writer.js";

function makeCtx(): CityContext {
	return {
		city: "Poconé",
		cityIbgeId: 5106505,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: 0, longitude: 0 },
			high: { latitude: 1, longitude: 1 },
		},
		center: { latitude: 0.5, longitude: 0.5 },
	};
}

function makeResident(overrides?: Partial<CityResidentSeed>): CityResidentSeed {
	return {
		full_name: "Maria Silva",
		display_name: "Maria",
		phone: "(65) 91234-5678",
		email: "maria.silva.0.pocone-mt@oikos.seed",
		address: {
			zip_code: "78175-000",
			street: "Rua A",
			number: "123",
			complement: null,
			district: "Centro",
			city: "Poconé",
			city_ibge_id: 5106505,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: 0.5,
			longitude: 0.5,
		},
		...overrides,
	};
}

describe("json-city-residents-file-writer", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "city-residents-writer-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("writes to a custom outputDir instead of the default", () => {
		const writer = new JsonCityResidentsFileWriter(tempDir);
		const ctx = makeCtx();

		const result = writer.write(ctx, [makeResident()], {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
		});

		expect(result.path).toBe(join(tempDir, `${citySlug(ctx)}.json`));
		expect(existsSync(result.path)).toBe(true);
	});

	it("exists() reports false before writing and true after", () => {
		const writer = new JsonCityResidentsFileWriter(tempDir);
		const ctx = makeCtx();

		expect(writer.exists(ctx).exists).toBe(false);

		writer.write(ctx, [makeResident()], {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
		});

		expect(writer.exists(ctx).exists).toBe(true);
	});

	it("skips writing when the file already exists and force is not set", () => {
		const writer = new JsonCityResidentsFileWriter(tempDir);
		const ctx = makeCtx();
		const meta = {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
		};

		writer.write(ctx, [makeResident()], meta);
		const secondWrite = writer.write(ctx, [makeResident(), makeResident()], meta);

		expect(secondWrite.written).toBe(false);
	});

	it("overwrites when force is true", () => {
		const writer = new JsonCityResidentsFileWriter(tempDir);
		const ctx = makeCtx();
		const meta = {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
		};

		writer.write(ctx, [makeResident()], meta);
		const secondWrite = writer.write(
			ctx,
			[makeResident(), makeResident()],
			meta,
			{ force: true },
		);

		expect(secondWrite.written).toBe(true);
		expect(writer.read(ctx)).toHaveLength(2);
	});

	it("read() round-trips exactly what was written", () => {
		const writer = new JsonCityResidentsFileWriter(tempDir);
		const ctx = makeCtx();
		const residents = [makeResident({ email: "a@oikos.seed" }), makeResident({ email: "b@oikos.seed" })];

		writer.write(ctx, residents, {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
		});

		expect(writer.read(ctx)).toStrictEqual(residents);
	});

	it("read() throws a clear error when the file does not exist", () => {
		const writer = new JsonCityResidentsFileWriter(tempDir);

		expect(() => writer.read(makeCtx())).toThrow();
	});
});
