import type { CityContext } from "../../shared/entities/city-context.js";
import type { AddressSeed } from "../../shared/entities/address-seed.js";
import type { GooglePlace } from "../entities/google-place.js";

const DEFAULT_ZIP_CODE = "00000-000";
const DEFAULT_NUMBER = "S/N";
const DEFAULT_DISTRICT = "Centro";
const DEFAULT_STREET = "Endereço não informado";

/**
 * Heurística de parsing do formato típico BR retornado pelo Google
 * ("Rua X, 123 - Bairro, Cidade - UF, 00000-000, Brasil"). Frágil para
 * formatos fora do padrão — por isso os fallbacks abaixo.
 */
export class GoogleAddressParser {
	parse(place: GooglePlace, ctx: CityContext): AddressSeed {
		const raw = place.formattedAddress ?? "";

		const zipMatch = raw.match(/(\d{5}-\d{3})/);
		const zipCode = zipMatch ? zipMatch[1] : DEFAULT_ZIP_CODE;

		const segments = raw
			.replace(zipCode, "")
			.split(" - ")
			.map((s) => s.trim().replace(/,$/, "").trim());

		const streetParts = (segments[0] ?? "").split(",").map((s) => s.trim());
		const street = streetParts[0] || raw || DEFAULT_STREET;
		const number = streetParts[1] ?? DEFAULT_NUMBER;
		const district = segments[1] ?? DEFAULT_DISTRICT;

		return {
			zip_code: zipCode,
			street,
			number,
			complement: null,
			district,
			city: ctx.city,
			city_ibge_id: ctx.cityIbgeId,
			state: ctx.state,
			state_ibge_id: ctx.stateIbgeId,
			state_code: ctx.stateCode,
			// companyAddressSchema exige lat/lng não-nulos (regra de negócio:
			// endereço só é válido com geolocalização real) — cai para o centro
			// da cidade quando o Google não retorna location para o lugar.
			latitude: place.location?.latitude ?? ctx.center.latitude,
			longitude: place.location?.longitude ?? ctx.center.longitude,
		};
	}
}
