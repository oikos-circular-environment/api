import type { UserSeed } from "../../shared/entities/user-seed.js";
import type { CompanySeed } from "../entities/company-seed.js";

export const MAX_COMPANIES_PER_USER = 2;

/**
 * Distribui as empresas geradas entre os usuários, round-robin, nunca
 * excedendo `MAX_COMPANIES_PER_USER` empresas para o mesmo usuário. Chamado
 * ao final do pipeline (`GenerateCitySeedUseCase`), depois que a lista de
 * empresas está fechada (reais + sintéticas + reparadas). Retorna um mapa
 * índice-do-usuário → empresas dele — quem aninha isso em `UserSeed.companies`
 * é `cli/cli.ts`, na montagem final do arquivo da cidade.
 */
export class CompanyOwnerAssigner {
	assign(
		companies: CompanySeed[],
		users: UserSeed[],
	): Map<number, CompanySeed[]> {
		const capacity = users.length * MAX_COMPANIES_PER_USER;
		if (companies.length > capacity) {
			throw new Error(
				`Pool de usuários insuficiente: ${companies.length} empresas exigem ` +
					`pelo menos ${Math.ceil(companies.length / MAX_COMPANIES_PER_USER)} usuários ` +
					`(há ${users.length}, capacidade máxima de ${capacity} empresas).`,
			);
		}

		const ownedByUser = new Map<number, CompanySeed[]>();
		const companiesOwnedBy = new Array<number>(users.length).fill(0);

		for (const company of companies) {
			const userIndex = companiesOwnedBy.findIndex(
				(count) => count < MAX_COMPANIES_PER_USER,
			);
			companiesOwnedBy[userIndex]++;

			const existing = ownedByUser.get(userIndex);
			if (existing) {
				existing.push(company);
			} else {
				ownedByUser.set(userIndex, [company]);
			}
		}

		return ownedByUser;
	}
}
