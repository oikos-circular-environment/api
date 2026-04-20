import type { Company } from "@/modules/companies/dtos/companies-dto.js";

export type PrismaCompany = {
	id: string;
	user_id: string;
	identity: string;
	identity_type: "CPF" | "CNPJ";
	company_type: "ONG" | "COMPANY" | "GOVERNMENT" | "COLLECTOR";
	status: boolean;
	is_headquarters: boolean;
	business_name: string | null;
	corporate_name: string;
	accept_appointments: boolean;
	email: string | null;
	phones: string[];
	started_activity_in: Date;
	created_at: Date;
	updated_at: Date;
} | null;

export function companyMapper(company: PrismaCompany): Company | null {
	if (!company) {
		return null;
	}

	return {
		id: company.id,
		user_id: company.user_id,
		identity: company.identity,
		identity_type: company.identity_type,
		company_type: company.company_type,
		status: company.status,
		is_headquarters: company.is_headquarters,
		business_name: company.business_name,
		corporate_name: company.corporate_name,
		accept_appointments: company.accept_appointments,
		email: company.email,
		phones: company.phones,
		started_activity_in: company.started_activity_in,
		created_at: company.created_at,
		updated_at: company.updated_at,
	};
}
