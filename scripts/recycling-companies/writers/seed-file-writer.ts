import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed, SeedFileMeta } from "../entities/company-seed.js";

export interface WriteResult {
	written: boolean;
	path: string;
}

export interface SeedFileWriter {
	write(
		ctx: CityContext,
		companies: CompanySeed[],
		meta: Omit<SeedFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult;
}
