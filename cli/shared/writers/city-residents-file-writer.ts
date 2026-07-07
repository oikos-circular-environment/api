import type { CityContext } from "../entities/city-context.js";
import type {
	CityResidentSeed,
	CityResidentsFileMeta,
} from "../entities/city-resident.js";

export interface WriteResult {
	written: boolean;
	path: string;
}

export interface ExistsResult {
	exists: boolean;
	path: string;
}

export interface CityResidentsFileWriter {
	/** Checagem pura, sem side-effect — permite decidir antes de gerar o pool. */
	exists(ctx: CityContext): ExistsResult;

	write(
		ctx: CityContext,
		residents: CityResidentSeed[],
		meta: Omit<CityResidentsFileMeta, "total">,
		opts?: { force?: boolean },
	): WriteResult;

	/** Carrega o pool já gravado — só deve ser chamado depois de confirmar `exists().exists === true`. */
	read(ctx: CityContext): CityResidentSeed[];
}
