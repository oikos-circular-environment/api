import type { AddressSeed } from "./address-seed.js";

export interface CityResidentSeed {
	full_name: string;
	display_name: string;
	phone: string;
	email: string;
	address: AddressSeed;
}

export interface CityResidentsFileMeta {
	generated_at: string;
	total: number;
	city: string;
	state_code: string;
}

export interface CityResidentsFile {
	_meta: CityResidentsFileMeta;
	residents: CityResidentSeed[];
}
