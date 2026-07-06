import type { IbgeMunicipio, IbgeUf } from "../entities/ibge-municipio.js";

export interface MunicipioProvider {
	fetchUfs(): Promise<IbgeUf[]>;
	fetchByUf(stateCode: string): Promise<IbgeMunicipio[]>;
}
