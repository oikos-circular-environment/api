import { faker } from "@faker-js/faker";
import type { AddressSeed } from "../entities/address-seed.js";
import type { CityContext } from "../entities/city-context.js";
import type { UserSeed } from "../entities/user-seed.js";
import { citySlug, normalizeSlugPart } from "./city-slug.js";
import { generateFakePhone } from "./fake-phone.js";

export const MIN_USERS_PER_CITY = 10;
const MAX_COMPANIES_PER_USER = 2;

/**
 * Mesma constante de `companies/services/company-owner-assigner.ts` — mantidas
 * em sincronia manualmente (o assigner lança erro se o pool ficar pequeno
 * demais para o teto aqui assumido).
 */
export function computeUserPoolSize(opts: {
	companiesTarget?: number;
	complaintsTarget?: number;
	usersFloor?: number;
}): number {
	const forCompanies = opts.companiesTarget
		? Math.ceil(opts.companiesTarget / MAX_COMPANIES_PER_USER)
		: 0;
	const forComplaints = opts.complaintsTarget
		? Math.ceil(opts.complaintsTarget * 0.6)
		: 0;
	return Math.max(
		MIN_USERS_PER_CITY,
		forCompanies,
		forComplaints,
		opts.usersFloor ?? 0,
	);
}

function formatZipCode(): string {
	return faker.string.numeric(8).replace(/(\d{5})(\d{3})/, "$1-$2");
}

function generateUserAddress(ctx: CityContext): AddressSeed {
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

/** Gera um pool de usuários fictícios de uma cidade — compartilhado pelos
 * pipelines de empresas (donos) e denúncias (autores/votantes/resolvedores).
 * `companies`/`complaints` saem vazios; as fases seguintes do pipeline os
 * preenchem via spread (ver `cli/cli.ts`). */
export class UserGenerator {
	generate(ctx: CityContext, count: number): UserSeed[] {
		return Array.from({ length: count }, (_, index) =>
			this.generateOne(ctx, index),
		);
	}

	private generateOne(ctx: CityContext, index: number): UserSeed {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const emailSlug = normalizeSlugPart(`${firstName} ${lastName}`);

		return {
			full_name: `${firstName} ${lastName}`,
			display_name: firstName,
			phone: generateFakePhone(),
			email: `${emailSlug}.${index}.${citySlug(ctx)}@oikos.seed`,
			address: generateUserAddress(ctx),
			companies: [],
			complaints: [],
		};
	}
}
