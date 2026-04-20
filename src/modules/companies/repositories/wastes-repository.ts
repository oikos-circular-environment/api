import type { CompanyWaste, CompanyWasteInput } from "../dtos/companies-dto.js";

export interface WastesRepository {
	findByCompanyId(companyId: string): Promise<CompanyWaste[]>;

	replaceMany(
		companyId: string,
		data: CompanyWasteInput[],
	): Promise<CompanyWaste[]>;
}
