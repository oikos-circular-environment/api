import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed, SeedFileMeta } from "../entities/company-seed.js";

export interface WriteResult {
	written: boolean;
	path: string;
}

export interface ExistsResult {
	exists: boolean;
	path: string;
}

export interface SeedFileWriter {
	/** Checagem pura, sem side-effect — permite decidir antes de rodar o resto do pipeline. */
	exists(ctx: CityContext): ExistsResult;

	write(
		ctx: CityContext,
		companies: CompanySeed[],
		meta: Omit<SeedFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult;
}
