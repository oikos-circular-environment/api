import { faker } from "@faker-js/faker";
import type { Geospatial } from "../../../src/modules/complaints/entities/complaint-entity.js";
import type { CityContext } from "../../shared/entities/city-context.js";

/**
 * Fabrica um `geospatial` plausível dentro dos bounds da cidade resolvida —
 * não há fonte real de reverse-geocoding para denúncia sintética (diferente
 * de empresas, onde dado real do Google é preferido quando existe). Mantém
 * `addresses.city/region/country/timezone` consistentes com o `CityContext`
 * real; o resto (`district`, `street`, `postalCode`) é fabricado.
 */
export class SyntheticGeospatialGenerator {
	generate(ctx: CityContext): Geospatial {
		const latitude = faker.number.float({
			min: ctx.bounds.low.latitude,
			max: ctx.bounds.high.latitude,
			fractionDigits: 6,
		});
		const longitude = faker.number.float({
			min: ctx.bounds.low.longitude,
			max: ctx.bounds.high.longitude,
			fractionDigits: 6,
		});

		return {
			heading: null,
			location: {
				coords: {
					latitude,
					longitude,
					altitude: null,
					accuracy: null,
					altitudeAccuracy: null,
					heading: null,
					speed: null,
				},
				timestamp: faker.date.recent().getTime(),
			},
			addresses: {
				city: ctx.city,
				district: faker.location.county(),
				streetNumber: faker.location.buildingNumber(),
				street: faker.location.street(),
				region: ctx.stateCode,
				subregion: null,
				country: "Brasil",
				postalCode: faker.string.numeric(8),
				name: null,
				isoCountryCode: "BR",
				timezone: "America/Sao_Paulo",
				formattedAddress: `${faker.location.street()}, ${ctx.city} - ${ctx.stateCode}`,
			},
		};
	}
}
