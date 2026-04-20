import type {
	CompanyAddress,
	CreateCompanyAddress,
	UpdateCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";

export interface AddressesRepository {
	findById(id: string): Promise<CompanyAddress | null>;
	findByCompanyId(companyId: string): Promise<CompanyAddress | null>;
	create(data: CreateCompanyAddress): Promise<CompanyAddress>;
	update(
		id: string,
		data: UpdateCompanyAddress,
	): Promise<CompanyAddress | null>;
}
