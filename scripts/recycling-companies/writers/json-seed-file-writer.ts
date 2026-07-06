import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed, SeedFileMeta } from "../entities/company-seed.js";
import type {
	ExistsResult,
	SeedFileWriter,
	WriteResult,
} from "./seed-file-writer.js";

export const DEFAULT_SEEDS_DIR = resolve("prisma/seeds/recycling-companies");

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
	constructor(private readonly outputDir: string = DEFAULT_SEEDS_DIR) {}

	exists(ctx: CityContext): ExistsResult {
		const path = resolve(this.outputDir, `${citySlug(ctx)}.json`);
		return { exists: existsSync(path), path };
	}

	write(
		ctx: CityContext,
		companies: CompanySeed[],
		meta: Omit<SeedFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult {
		const { exists, path } = this.exists(ctx);

		if (exists && !opts?.force) {
			return { written: false, path };
		}

		mkdirSync(dirname(path), { recursive: true });

		const output = {
			_meta: { ...meta, total: companies.length },
			companies,
		};

		writeFileSync(path, JSON.stringify(output, null, 2), "utf-8");

		return { written: true, path };
	}
}
