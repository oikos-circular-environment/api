import type { IbgeMunicipio } from "../entities/ibge-municipio.js";

export interface MunicipioProvider {
	fetchByUf(stateCode: string): Promise<IbgeMunicipio[]>;
}
