import { faker } from "@faker-js/faker";
import type { CityContext } from "../entities/city-context.js";
import type {
	CompanySeed,
	CompanyType,
	IdentityType,
} from "../entities/company-seed.js";
import { generateSyntheticHours } from "./company-gap-filler.js";
import type { BrazilianIdentityGenerator } from "./identity-generator.js";
import {
	ECOPONTO_CATEGORY_POOL,
	RECYCLER_CATEGORY_POOL,
	type WasteServiceGenerator,
} from "./waste-service-generator.js";

interface TypeDistributionEntry {
	company_type: CompanyType;
	identity_type: IdentityType;
	weight: number;
}

const TYPE_DISTRIBUTION: TypeDistributionEntry[] = [
	{ company_type: "COMPANY", identity_type: "CNPJ", weight: 55 },
	{ company_type: "ONG", identity_type: "CNPJ", weight: 15 },
	{ company_type: "GOVERNMENT", identity_type: "CNPJ", weight: 10 },
	{ company_type: "COLLECTOR", identity_type: "CPF", weight: 20 },
];

function pickDistributionEntry(): TypeDistributionEntry {
	return faker.helpers.weightedArrayElement(
		TYPE_DISTRIBUTION.map((entry) => ({ value: entry, weight: entry.weight })),
	);
}

function formatZipCode(): string {
	return faker.string.numeric(8).replace(/(\d{5})(\d{3})/, "$1-$2");
}

function formatPhone(): string {
	return `(${faker.string.numeric(2)}) 9${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
}

/**
 * Empresa 100% sintética (nome, endereço e geo fabricados) — usada só quando
 * `--target` pede mais unidades do que o Google retornou para a cidade. Nome/
 * endereço reais nunca são fabricados quando há dado real (ver 01-technical-plan.md);
 * este gerador só existe para o caso em que não há dado real disponível.
 */
export class SyntheticCompanyGenerator {
	constructor(
		private readonly wasteServiceGenerator: WasteServiceGenerator,
		private readonly identityGenerator: BrazilianIdentityGenerator,
	) {}

	generate(ctx: CityContext): CompanySeed {
		const { company_type, identity_type } = pickDistributionEntry();
		const name = `${faker.company.name()} Reciclagem`;
		const pool =
			company_type === "GOVERNMENT"
				? ECOPONTO_CATEGORY_POOL
				: RECYCLER_CATEGORY_POOL;

		return {
			_source: {
				google_place_id: null,
				rating: null,
				types: [],
				is_ecoponto: false,
				synthetic: true,
			},
			corporate_name: name,
			business_name: name,
			identity: this.identityGenerator.next(identity_type),
			identity_type,
			company_type,
			status: true,
			email: `${faker.internet.username()}@${faker.internet.domainName()}`,
			phones: [formatPhone()],
			website: null,
			started_activity_in: faker.date.past({ years: 10 }).toISOString(),
			address: {
				zip_code: formatZipCode(),
				street: faker.location.street(),
				number: faker.location.buildingNumber(),
				complement: null,
				district: faker.location.county(),
				city: ctx.city,
				city_ibge_id: ctx.cityIbgeId,
				state: ctx.state,
				state_ibge_id: ctx.stateIbgeId,
				state_code: ctx.stateCode,
				latitude: faker.number.float({
					min: ctx.bounds.low.latitude,
					max: ctx.bounds.high.latitude,
					fractionDigits: 6,
				}),
				longitude: faker.number.float({
					min: ctx.bounds.low.longitude,
					max: ctx.bounds.high.longitude,
					fractionDigits: 6,
				}),
			},
			business_hours: generateSyntheticHours(),
			wastes: this.wasteServiceGenerator.generateWastes(pool),
			services: this.wasteServiceGenerator.generateServices(pool),
		};
	}
}
