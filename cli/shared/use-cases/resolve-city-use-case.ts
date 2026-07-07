import type { CityContext } from "../entities/city-context.js";
import type { GeocodingProvider } from "../providers/geocoding-provider.js";
import {
	getUf,
	resolveMunicipio,
} from "../providers/ibge-municipio-provider.js";
import type { MunicipioProvider } from "../providers/municipio-provider.js";

/** Junta geocoding (Google) + resolução de município (IBGE) num CityContext. */
export class ResolveCityUseCase {
	constructor(
		private readonly municipioProvider: MunicipioProvider,
		private readonly geocodingProvider: GeocodingProvider,
	) {}

	async execute(city: string, stateCode: string): Promise<CityContext> {
		const municipios = await this.municipioProvider.fetchByUf(stateCode);
		const municipio = resolveMunicipio(city, municipios);
		const uf = getUf(municipio);

		const geo = await this.geocodingProvider.geocodeCity(city, stateCode);

		return {
			city: municipio.nome,
			cityIbgeId: municipio.id,
			state: uf.nome,
			stateIbgeId: uf.id,
			stateCode: uf.sigla,
			bounds: geo.bounds,
			center: geo.center,
		};
	}
}
