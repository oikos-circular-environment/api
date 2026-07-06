import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed, SeedFileMeta } from "../entities/company-seed.js";
import type { SeedFileWriter, WriteResult } from "./seed-file-writer.js";

const SEEDS_DIR = resolve("prisma/seeds/recycling-companies");

function normalizeSlugPart(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** Slug inclui a UF — há cidades homônimas em estados diferentes no Brasil. */
export function citySlug(ctx: CityContext): string {
	return `${normalizeSlugPart(ctx.city)}-${ctx.stateCode.toLowerCase()}`;
}

export class JsonSeedFileWriter implements SeedFileWriter {
	write(
		ctx: CityContext,
		companies: CompanySeed[],
		meta: Omit<SeedFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult {
		const filePath = resolve(SEEDS_DIR, `${citySlug(ctx)}.json`);

		if (existsSync(filePath) && !opts?.force) {
			return { written: false, path: filePath };
		}

		mkdirSync(dirname(filePath), { recursive: true });

		const output = {
			_meta: { ...meta, total: companies.length },
			companies,
		};

		writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");

		return { written: true, path: filePath };
	}
}
