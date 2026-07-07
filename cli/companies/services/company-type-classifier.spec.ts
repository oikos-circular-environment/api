import { describe, expect, it } from "vitest";
import type { GooglePlace } from "../entities/google-place.js";
import { CompanyTypeClassifier } from "./company-type-classifier.js";

function makePlace(displayName: string, formattedAddress = ""): GooglePlace {
	return { id: "1", displayName: { text: displayName }, formattedAddress };
}

describe("company-type-classifier", () => {
	const classifier = new CompanyTypeClassifier();

	it("classifies a prefeitura/secretaria as GOVERNMENT without is_ecoponto", () => {
		const result = classifier.classify(
			makePlace("Prefeitura Municipal de Poconé - Secretaria de Meio Ambiente"),
		);

		expect(result.company_type).toBe("GOVERNMENT");
		expect(result.identity_type).toBe("CNPJ");
		expect(result.is_ecoponto).toBe(false);
	});

	it("classifies an ecoponto as GOVERNMENT with is_ecoponto true", () => {
		const result = classifier.classify(makePlace("Ecoponto Bairro Centro"));

		expect(result.company_type).toBe("GOVERNMENT");
		expect(result.is_ecoponto).toBe(true);
	});

	it("classifies a cooperative/association as ONG", () => {
		const result = classifier.classify(
			makePlace("Cooperativa de Catadores Nova Esperança"),
		);

		expect(result.company_type).toBe("ONG");
		expect(result.identity_type).toBe("CNPJ");
	});

	it("classifies an informal ferro-velho/sucata as COLLECTOR with CPF", () => {
		const result = classifier.classify(makePlace("Ferro Velho do Zé"));

		expect(result.company_type).toBe("COLLECTOR");
		expect(result.identity_type).toBe("CPF");
	});

	it("classifies a qualified sucata business (LTDA) as COMPANY, not COLLECTOR", () => {
		const result = classifier.classify(
			makePlace("Sucata e Comércio de Metais LTDA"),
		);

		expect(result.company_type).toBe("COMPANY");
		expect(result.identity_type).toBe("CNPJ");
	});

	it("defaults to COMPANY/CNPJ when there is no special signal", () => {
		const result = classifier.classify(makePlace("Recicla Fácil Recicláveis"));

		expect(result.company_type).toBe("COMPANY");
		expect(result.identity_type).toBe("CNPJ");
	});

	it("normalizes accents and case before matching", () => {
		const result = classifier.classify(
			makePlace("PREFEITURA MUNICIPAL DE PONTA PORÃ"),
		);

		expect(result.company_type).toBe("GOVERNMENT");
	});
});
