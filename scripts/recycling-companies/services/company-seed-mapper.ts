import { faker } from "@faker-js/faker";
import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed } from "../entities/company-seed.js";
import type { GooglePlace } from "../entities/google-place.js";
import type { GoogleAddressParser } from "./address-parser.js";
import type { CompanyGapFiller } from "./company-gap-filler.js";
import type { CompanyTypeClassifier } from "./company-type-classifier.js";
import type { BrazilianIdentityGenerator } from "./identity-generator.js";
import {
	ECOPONTO_CATEGORY_POOL,
	RECYCLER_CATEGORY_POOL,
	type WasteServiceGenerator,
} from "./waste-service-generator.js";

const DEFAULT_NAME = "Empresa de Reciclagem";

/**
 * Compõe address-parser + classifier + gap-filler + waste-service-generator
 * + identity-generator num CompanySeed completo. Regra não-negociável:
 * todo campo com valor real do Google vence; Faker só age quando o campo é
 * null/ausente/vazio (ver 01-technical-plan.md).
 */
export class CompanySeedMapper {
	constructor(
		private readonly addressParser: GoogleAddressParser,
		private readonly classifier: CompanyTypeClassifier,
		private readonly gapFiller: CompanyGapFiller,
		private readonly wasteServiceGenerator: WasteServiceGenerator,
		private readonly identityGenerator: BrazilianIdentityGenerator,
	) {}

	map(place: GooglePlace, ctx: CityContext): CompanySeed {
		const classification = this.classifier.classify(place);
		const address = this.addressParser.parse(place, ctx);
		const gaps = this.gapFiller.fill(place);

		const pool =
			classification.company_type === "GOVERNMENT"
				? ECOPONTO_CATEGORY_POOL
				: RECYCLER_CATEGORY_POOL;

		const name = place.displayName?.text || DEFAULT_NAME;

		return {
			_source: {
				google_place_id: place.id,
				rating: place.rating ?? null,
				types: place.types ?? [],
				is_ecoponto: classification.is_ecoponto,
				synthetic: false,
			},
			corporate_name: name,
			business_name: name,
			identity: this.identityGenerator.next(classification.identity_type),
			identity_type: classification.identity_type,
			company_type: classification.company_type,
			status:
				place.businessStatus != null
					? place.businessStatus === "OPERATIONAL"
					: true,
			email: gaps.email,
			phones: gaps.phones,
			website: place.websiteUri ?? null,
			started_activity_in: faker.date.past({ years: 10 }).toISOString(),
			address,
			business_hours: gaps.business_hours,
			wastes: this.wasteServiceGenerator.generateWastes(pool),
			services: this.wasteServiceGenerator.generateServices(pool),
		};
	}
}
