import type {
	Company,
	CreateCompany,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";

export interface CompaniesRepository {
	findById(id: string): Promise<Company | null>;
	findByUserId(userId: string): Promise<Company[]>;
	findByUserAndCompanyId(
		userId: string,
		companyId: string,
	): Promise<Company | null>;
	create(data: CreateCompany): Promise<Company>;
	update(id: string, data: UpdateCompany): Promise<Company | null>;
	uploadAvatar(
		companyId: string,
		data: { url: string; file_name: string; path: string },
	): Promise<Company | null>;
}
