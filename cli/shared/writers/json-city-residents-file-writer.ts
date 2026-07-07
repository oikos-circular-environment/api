import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CityContext } from "../entities/city-context.js";
import type {
	CityResidentSeed,
	CityResidentsFile,
	CityResidentsFileMeta,
} from "../entities/city-resident.js";
import { citySlug } from "../services/city-slug.js";
import type {
	CityResidentsFileWriter,
	ExistsResult,
	WriteResult,
} from "./city-residents-file-writer.js";

export const DEFAULT_CITY_RESIDENTS_DIR = resolve("prisma/seeds/city-residents");

export class JsonCityResidentsFileWriter implements CityResidentsFileWriter {
	constructor(
		private readonly outputDir: string = DEFAULT_CITY_RESIDENTS_DIR,
	) {}

	exists(ctx: CityContext): ExistsResult {
		const path = resolve(this.outputDir, `${citySlug(ctx)}.json`);
		return { exists: existsSync(path), path };
	}

	write(
		ctx: CityContext,
		residents: CityResidentSeed[],
		meta: Omit<CityResidentsFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult {
		const { exists, path } = this.exists(ctx);

		if (exists && !opts?.force) {
			return { written: false, path };
		}

		mkdirSync(dirname(path), { recursive: true });

		const output: CityResidentsFile = {
			_meta: { ...meta, total: residents.length },
			residents,
		};

		writeFileSync(path, JSON.stringify(output, null, 2), "utf-8");

		return { written: true, path };
	}

	read(ctx: CityContext): CityResidentSeed[] {
		const { exists, path } = this.exists(ctx);
		if (!exists) {
			throw new Error(
				`Pool de moradores não encontrado para ${citySlug(ctx)} em ${path}`,
			);
		}

		const parsed: CityResidentsFile = JSON.parse(readFileSync(path, "utf-8"));
		return parsed.residents;
	}
}
