import {
	companyGeneralRegistrationValidationSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../../src/modules/companies/dtos/companies-dto.js";
import type { CompanySeed } from "../entities/company-seed.js";
import { generateSyntheticHours } from "./company-gap-filler.js";
import { generateFakePhone } from "./fake-phone.js";

export interface RepairResult {
	seed: CompanySeed;
	fixes: string[];
	stillInvalid: boolean;
}

/**
 * Segunda onda de validação — rede de segurança que roda depois que
 * `CompanySeedMapper`/`SyntheticCompanyGenerator` já produziram o
 * `CompanySeed`. Em condições normais essas duas classes já garantem dados
 * válidos (`CompanyGapFiller` sempre preenche telefone/horário ausentes);
 * isso existe para o caso de uma regressão futura deixar passar um vazio,
 * corrigindo em vez de deixar o dado inválido chegar no arquivo de seed.
 */
export class CompanySeedRepairer {
	repair(seed: CompanySeed): RepairResult {
		const fixes: string[] = [];
		let repaired = seed;

		if (repaired.phones.length === 0) {
			repaired = { ...repaired, phones: [generateFakePhone()] };
			fixes.push("telefone ausente — gerado sintético");
		}

		if (repaired.business_hours.length === 0) {
			repaired = { ...repaired, business_hours: generateSyntheticHours() };
			fixes.push("horário ausente — gerado sintético");
		}

		const generalRegistrationOk =
			companyGeneralRegistrationValidationSchema.safeParse(repaired).success;
		const addressOk = upsertCompanyAddressSchema.safeParse(
			repaired.address,
		).success;
		const businessHoursOk = upsertCompanyBusinessHoursSchema.safeParse({
			business_hours: repaired.business_hours,
		}).success;

		return {
			seed: repaired,
			fixes,
			stillInvalid: !generalRegistrationOk || !addressOk || !businessHoursOk,
		};
	}
}
