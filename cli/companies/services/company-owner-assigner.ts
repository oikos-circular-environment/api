import type { CityResidentSeed } from "../../shared/entities/city-resident.js";
import type { CompanySeed, UnownedCompanySeed } from "../entities/company-seed.js";

export const MAX_COMPANIES_PER_RESIDENT = 2;

/**
 * Distribui `owner_resident_index` entre as empresas geradas, round-robin,
 * nunca excedendo `MAX_COMPANIES_PER_RESIDENT` empresas para o mesmo morador.
 * Chamado ao final do pipeline (`GenerateCitySeedUseCase`), depois que a
 * lista de empresas está fechada (reais + sintéticas + reparadas).
 */
export class CompanyOwnerAssigner {
	assign(
		companies: UnownedCompanySeed[],
		residents: CityResidentSeed[],
	): CompanySeed[] {
		const capacity = residents.length * MAX_COMPANIES_PER_RESIDENT;
		if (companies.length > capacity) {
			throw new Error(
				`Pool de moradores insuficiente: ${companies.length} empresas exigem ` +
					`pelo menos ${Math.ceil(companies.length / MAX_COMPANIES_PER_RESIDENT)} moradores ` +
					`(há ${residents.length}, capacidade máxima de ${capacity} empresas).`,
			);
		}

		const companiesOwnedBy = new Array<number>(residents.length).fill(0);

		return companies.map((company) => {
			const residentIndex = companiesOwnedBy.findIndex(
				(count) => count < MAX_COMPANIES_PER_RESIDENT,
			);
			companiesOwnedBy[residentIndex]++;

			return { ...company, owner_resident_index: residentIndex };
		});
	}
}
