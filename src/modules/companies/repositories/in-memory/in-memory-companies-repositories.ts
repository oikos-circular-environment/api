import { randomUUID } from "node:crypto";
import type {
	Company,
	CreateCompany,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "../companies-repository.js";

export class InMemoryCompaniesRepository implements CompaniesRepository {
	public items: Company[] = [];

	async findById(id: string) {
		const company = this.items.find((item) => item.id === id);

		return company ?? null;
	}

	async findByUserId(userId: string) {
		const company = this.items.find((item) => item.user_id === userId);

		return company ?? null;
	}

	async create(data: CreateCompany) {
		const now = new Date();
		const company = {
			id: randomUUID(),
			user_id: data.user_id,
			identity: data.identity,
			identity_type: data.identity_type,
			company_type: data.company_type,
			status: data.status,
			is_headquarters: data.is_headquarters,
			business_name: data.business_name ?? null,
			corporate_name: data.corporate_name,
			accept_appointments: data.accept_appointments,
			email: data.email ?? null,
			phones: data.phones,
			started_activity_in: data.started_activity_in,
			created_at: now,
			updated_at: now,
		} satisfies Company;

		this.items.push(company);

		return company;
	}

	async update(id: string, data: UpdateCompany) {
		const company = await this.findById(id);

		if (!company) {
			return null;
		}

		Object.assign(company, {
			...data,
			updated_at: new Date(),
		});

		return company;
	}
}
