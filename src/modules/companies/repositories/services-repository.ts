import type {
	CompanyService,
	CompanyServiceInput,
} from "../dtos/companies-dto.js";

export interface ServicesRepository {
	findByCompanyId(companyId: string): Promise<CompanyService[]>;

	replaceMany(
		companyId: string,
		data: CompanyServiceInput[],
	): Promise<CompanyService[]>;
}
