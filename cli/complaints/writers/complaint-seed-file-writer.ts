import type { CityContext } from "../../shared/entities/city-context.js";
import type {
	ComplaintSeed,
	ComplaintSeedFileMeta,
} from "../entities/complaint-seed.js";

export interface WriteResult {
	written: boolean;
	path: string;
}

export interface ExistsResult {
	exists: boolean;
	path: string;
}

export interface ComplaintSeedFileWriter {
	/** Checagem pura, sem side-effect — permite decidir antes de gerar as denúncias. */
	exists(ctx: CityContext): ExistsResult;

	write(
		ctx: CityContext,
		complaints: ComplaintSeed[],
		meta: Omit<ComplaintSeedFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult;
}
