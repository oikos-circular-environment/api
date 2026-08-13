import type { Company } from "@/modules/companies/dtos/companies-dto.js";

export type PrismaCompany = {
	id: string;
	user_id: string;
	organization_id: string;
	identity: string;
	identity_type: "CPF" | "CNPJ";
	company_type: "ONG" | "COMPANY" | "GOVERNMENT" | "COLLECTOR";
	status: boolean;
	business_name: string;
	corporate_name: string;
	email: string | null;
	phones: string[];
	started_activity_in: Date;
	is_company_valid: boolean;
	created_at: Date;
	updated_at: Date;
	avatar: {
		id: string;
		url: string;
		file_name: string;
		path: string;
		created_at: Date;
	} | null;
} | null;

export function companyMapper(company: PrismaCompany): Company | null {
	if (!company) {
		return null;
	}

	return {
		id: company.id,
		user_id: company.user_id,
		organization_id: company.organization_id,
		identity: company.identity,
		identity_type: company.identity_type,
		company_type: company.company_type,
		status: company.status,
		business_name: company.business_name,
		corporate_name: company.corporate_name,
		email: company.email,
		phones: company.phones,
		started_activity_in: company.started_activity_in,
		is_company_valid: company.is_company_valid,
		avatar: company.avatar
			? {
					id: company.avatar.id,
					url: company.avatar.url,
					file_name: company.avatar.file_name,
					path: company.avatar.path,
					created_at: company.avatar.created_at,
				}
			: null,
		created_at: company.created_at,
		updated_at: company.updated_at,
	};
}
