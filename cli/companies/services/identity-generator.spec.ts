import { describe, expect, it } from "vitest";
import {
	BrazilianIdentityGenerator,
	computeCnpjCheckDigits,
	computeCpfCheckDigits,
} from "./identity-generator.js";

describe("identity-generator", () => {
	it("computes correct CPF check digits against a known valid CPF (123.456.789-09)", () => {
		expect(computeCpfCheckDigits("123456789")).toStrictEqual(["0", "9"]);
	});

	it("computes correct CNPJ check digits against a known valid CNPJ (11.222.333/0001-81)", () => {
		expect(computeCnpjCheckDigits("112223330001")).toStrictEqual(["8", "1"]);
	});

	it("generates CPFs with 11 numeric digits and a valid checksum", () => {
		const generator = new BrazilianIdentityGenerator();

		for (let i = 0; i < 20; i++) {
			const cpf = generator.nextCpf();
			expect(cpf).toMatch(/^\d{11}$/);
			const [d1, d2] = computeCpfCheckDigits(cpf.slice(0, 9));
			expect(cpf.slice(9)).toBe(`${d1}${d2}`);
		}
	});

	it("generates CNPJs with 14 numeric digits, branch 0001, and a valid checksum", () => {
		const generator = new BrazilianIdentityGenerator();

		for (let i = 0; i < 20; i++) {
			const cnpj = generator.nextCnpj();
			expect(cnpj).toMatch(/^\d{14}$/);
			expect(cnpj.slice(8, 12)).toBe("0001");
			const [d1, d2] = computeCnpjCheckDigits(cnpj.slice(0, 12));
			expect(cnpj.slice(12)).toBe(`${d1}${d2}`);
		}
	});

	it("never repeats an identity across many calls", () => {
		const generator = new BrazilianIdentityGenerator();
		const seen = new Set<string>();

		for (let i = 0; i < 200; i++) {
			const cpf = generator.nextCpf();
			const cnpj = generator.nextCnpj();
			expect(seen.has(cpf)).toBe(false);
			expect(seen.has(cnpj)).toBe(false);
			seen.add(cpf);
			seen.add(cnpj);
		}
	});

	it("next() dispatches to nextCpf/nextCnpj based on identity type", () => {
		const generator = new BrazilianIdentityGenerator();

		expect(generator.next("CPF")).toMatch(/^\d{11}$/);
		expect(generator.next("CNPJ")).toMatch(/^\d{14}$/);
	});
});
