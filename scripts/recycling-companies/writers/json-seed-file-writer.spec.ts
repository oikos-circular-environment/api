import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import { citySlug, JsonSeedFileWriter } from "./json-seed-file-writer.js";

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

describe("json-seed-file-writer", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "recycling-seed-writer-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("writes to a custom outputDir instead of the default", () => {
		const writer = new JsonSeedFileWriter(tempDir);
		const ctx = makeCtx();

		const result = writer.write(ctx, [], {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
			queries_used: [],
		});

		expect(result.path).toBe(join(tempDir, `${citySlug(ctx)}.json`));
		expect(existsSync(result.path)).toBe(true);
	});

	it("exists() reports false before writing and true after", () => {
		const writer = new JsonSeedFileWriter(tempDir);
		const ctx = makeCtx();

		expect(writer.exists(ctx).exists).toBe(false);

		writer.write(ctx, [], {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
			queries_used: [],
		});

		expect(writer.exists(ctx).exists).toBe(true);
	});

	it("exists() never writes to disk (pure check)", () => {
		const writer = new JsonSeedFileWriter(tempDir);
		const ctx = makeCtx();

		writer.exists(ctx);

		expect(existsSync(join(tempDir, `${citySlug(ctx)}.json`))).toBe(false);
	});

	it("skips writing when the file already exists and force is not set", () => {
		const writer = new JsonSeedFileWriter(tempDir);
		const ctx = makeCtx();
		const meta = {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
			queries_used: [],
		};

		writer.write(ctx, [], meta);
		const secondWrite = writer.write(ctx, [], meta);

		expect(secondWrite.written).toBe(false);
	});

	it("overwrites when force is true", () => {
		const writer = new JsonSeedFileWriter(tempDir);
		const ctx = makeCtx();
		const meta = {
			generated_at: new Date().toISOString(),
			city: ctx.city,
			state_code: ctx.stateCode,
			queries_used: [],
		};

		writer.write(ctx, [], meta);
		const secondWrite = writer.write(ctx, [], meta, { force: true });

		expect(secondWrite.written).toBe(true);
		const content = JSON.parse(readFileSync(secondWrite.path, "utf-8"));
		expect(content._meta.total).toBe(0);
	});
});
