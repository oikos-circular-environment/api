import type { IbgeMunicipio, IbgeUf } from "../entities/ibge-municipio.js";
import type { MunicipioProvider } from "./municipio-provider.js";

const BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

/**
 * Cliente da API pública do IBGE. Não existe busca por nome no servidor
 * (`?nome=` é ignorado) — o match precisa ser feito client-side sobre a
 * lista completa de municípios da UF.
 */
export class IbgeMunicipioProvider implements MunicipioProvider {
	async fetchByUf(stateCode: string): Promise<IbgeMunicipio[]> {
		const res = await fetch(`${BASE_URL}/estados/${stateCode}/municipios`);

		if (!res.ok) {
			throw new Error(
				`IBGE municípios falhou para UF ${stateCode} [${res.status}]: ${await res.text()}`,
			);
		}

		return (await res.json()) as IbgeMunicipio[];
	}
}

export function resolveMunicipio(
	cityName: string,
	municipios: IbgeMunicipio[],
): IbgeMunicipio {
	const target = normalize(cityName);
	const match = municipios.find((m) => normalize(m.nome) === target);

	if (!match) {
		throw new Error(
			`Município "${cityName}" não encontrado na lista de municípios do IBGE`,
		);
	}

	return match;
}

/** Isola o aninhamento `microrregiao.mesorregiao.UF` da API do IBGE. */
export function getUf(municipio: IbgeMunicipio): IbgeUf {
	return municipio.microrregiao.mesorregiao.UF;
}
