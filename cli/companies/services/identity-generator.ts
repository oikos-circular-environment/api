import { faker } from "@faker-js/faker";
import type { IdentityType } from "../entities/company-seed.js";

function sumWeighted(digits: number[], weights: number[]): number {
	return digits.reduce((sum, digit, i) => sum + digit * weights[i], 0);
}

function checkDigitFromRemainder(remainder: number): number {
	return remainder < 2 ? 0 : 11 - remainder;
}

/** Dígito verificador de CPF (módulo 11) — algoritmo padrão da Receita Federal. */
export function computeCpfCheckDigits(base9: string): [string, string] {
	const digits = base9.split("").map(Number);

	const d1 = checkDigitFromRemainder(
		sumWeighted(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11,
	);
	const d2 = checkDigitFromRemainder(
		sumWeighted([...digits, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11,
	);

	return [String(d1), String(d2)];
}

/** Dígito verificador de CNPJ (módulo 11) — algoritmo padrão da Receita Federal. */
export function computeCnpjCheckDigits(base12: string): [string, string] {
	const digits = base12.split("").map(Number);

	const d1 = checkDigitFromRemainder(
		sumWeighted(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11,
	);
	const d2 = checkDigitFromRemainder(
		sumWeighted([...digits, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11,
	);

	return [String(d1), String(d2)];
}

/**
 * Gera CPF/CNPJ com dígito verificador válido, garantindo unicidade dentro
 * da mesma instância (uma instância deve viver por toda a execução do CLI —
 * ver 01-technical-plan.md). Sem persistência entre execuções; o backstop
 * entre execuções separadas é a constraint `@unique` de `Company.identity`.
 */
export class BrazilianIdentityGenerator {
	private readonly issued = new Set<string>();

	nextCpf(): string {
		let identity: string;
		do {
			const base = faker.string.numeric(9);
			const [d1, d2] = computeCpfCheckDigits(base);
			identity = `${base}${d1}${d2}`;
		} while (this.issued.has(identity));

		this.issued.add(identity);
		return identity;
	}

	nextCnpj(): string {
		let identity: string;
		do {
			const base = `${faker.string.numeric(8)}0001`;
			const [d1, d2] = computeCnpjCheckDigits(base);
			identity = `${base}${d1}${d2}`;
		} while (this.issued.has(identity));

		this.issued.add(identity);
		return identity;
	}

	next(type: IdentityType): string {
		return type === "CPF" ? this.nextCpf() : this.nextCnpj();
	}
}
