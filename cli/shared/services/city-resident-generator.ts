import { faker } from "@faker-js/faker";
import type { AddressSeed } from "../entities/address-seed.js";
import type { CityContext } from "../entities/city-context.js";
import type { CityResidentSeed } from "../entities/city-resident.js";
import { citySlug, normalizeSlugPart } from "./city-slug.js";
import { generateFakePhone } from "./fake-phone.js";

export const MIN_RESIDENTS_PER_CITY = 10;
const MAX_COMPANIES_PER_RESIDENT = 2;

/**
 * Mesma constante de `companies/services/company-owner-assigner.ts` — mantidas
 * em sincronia manualmente (o assigner lança erro se o pool ficar pequeno
 * demais para o teto aqui assumido).
 */
export function computeResidentPoolSize(opts: {
	companiesTarget?: number;
	complaintsTarget?: number;
	residentsFloor?: number;
}): number {
	const forCompanies = opts.companiesTarget
		? Math.ceil(opts.companiesTarget / MAX_COMPANIES_PER_RESIDENT)
		: 0;
	const forComplaints = opts.complaintsTarget
		? Math.ceil(opts.complaintsTarget * 0.6)
		: 0;
	return Math.max(
		MIN_RESIDENTS_PER_CITY,
		forCompanies,
		forComplaints,
		opts.residentsFloor ?? 0,
	);
}

function formatZipCode(): string {
	return faker.string.numeric(8).replace(/(\d{5})(\d{3})/, "$1-$2");
}

function generateResidentAddress(ctx: CityContext): AddressSeed {
	return {
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
	};
}

/** Gera um pool de moradores fictícios de uma cidade — compartilhado pelos
 * pipelines de empresas (donos) e denúncias (autores/votantes/resolvedores). */
export class CityResidentGenerator {
	generate(ctx: CityContext, count: number): CityResidentSeed[] {
		return Array.from({ length: count }, (_, index) =>
			this.generateOne(ctx, index),
		);
	}

	private generateOne(ctx: CityContext, index: number): CityResidentSeed {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const emailSlug = normalizeSlugPart(`${firstName} ${lastName}`);

		return {
			full_name: `${firstName} ${lastName}`,
			display_name: firstName,
			phone: generateFakePhone(),
			email: `${emailSlug}.${index}.${citySlug(ctx)}@oikos.seed`,
			address: generateResidentAddress(ctx),
		};
	}
}
