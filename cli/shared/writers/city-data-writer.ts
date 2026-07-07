import type { CityContext } from "../entities/city-context.js";
import type { UserSeed } from "../entities/user-seed.js";

export interface CityData {
	users: UserSeed[];
}

export interface CityDataFileMeta {
	generated_at: string;
	city: string;
	state_code: string;
	users_total: number;
	companies_total: number;
	complaints_total: number;
}

export interface CityDataFile extends CityData {
	_meta: CityDataFileMeta;
}

export interface WriteResult {
	written: boolean;
	path: string;
}

export interface CityDataWriter {
	/** Sempre sobrescreve — não há checagem de "já existe" nem `force`, o CLI gera uma vez por cidade. */
	write(
		ctx: CityContext,
		data: CityData,
		meta: { generated_at: string },
	): WriteResult;
}
