import type { CompanyType, IdentityType } from "../entities/company-seed.js";
import type { GooglePlace } from "../entities/google-place.js";

export interface CompanyClassification {
	company_type: CompanyType;
	identity_type: IdentityType;
	is_ecoponto: boolean;
}

const GOVERNMENT_PATTERN =
	/\b(ecoponto|prefeitura|secretaria|municipal|municipio|sema)\b/;
const ECOPONTO_PATTERN = /\becoponto\b/;
const ONG_PATTERN = /\b(cooperativa|associacao|ong|catadores)\b/;
const INFORMAL_COLLECTOR_PATTERN = /\b(ferro velho|sucata)\b/;
const FORMAL_QUALIFIER_PATTERN =
	/\b(ltda|me|eireli|comercio|industria|cooperativa|associacao)\b/;

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

/**
 * Classifica o tipo de empresa a partir de sinais textuais (nome + endereço)
 * retornados pelo Google. `place.types` é tratado como sinal fraco (a Places
 * API costuma retornar tipos genéricos como "point_of_interest" mesmo para
 * sites geridos por prefeitura) — o sinal forte é o texto normalizado.
 */
export class CompanyTypeClassifier {
	classify(place: GooglePlace): CompanyClassification {
		const text = normalize(
			`${place.displayName?.text ?? ""} ${place.formattedAddress ?? ""}`,
		);

		if (GOVERNMENT_PATTERN.test(text)) {
			return {
				company_type: "GOVERNMENT",
				identity_type: "CNPJ",
				is_ecoponto: ECOPONTO_PATTERN.test(text),
			};
		}

		if (ONG_PATTERN.test(text)) {
			return { company_type: "ONG", identity_type: "CNPJ", is_ecoponto: false };
		}

		if (
			INFORMAL_COLLECTOR_PATTERN.test(text) &&
			!FORMAL_QUALIFIER_PATTERN.test(text)
		) {
			return {
				company_type: "COLLECTOR",
				identity_type: "CPF",
				is_ecoponto: false,
			};
		}

		return {
			company_type: "COMPANY",
			identity_type: "CNPJ",
			is_ecoponto: false,
		};
	}
}
