import { randomUUID } from "node:crypto";
import type {
	Company,
	CreateCompany,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "../companies-repository.js";

type CompanyAvatar = NonNullable<Company["avatar"]>;

export class InMemoryCompaniesRepository implements CompaniesRepository {
	public items: Company[] = [];
	public avatars: CompanyAvatar[] = [];

	async findById(id: string) {
		const company = this.items.find((item) => item.id === id);

		return company ?? null;
	}

	async findByUserId(userId: string) {
		return this.items.filter((item) => item.user_id === userId);
	}

	async findByUserAndCompanyId(userId: string, companyId: string) {
		const company = this.items.find(
			(item) => item.user_id === userId && item.id === companyId,
		);

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
			business_name: data.business_name,
			corporate_name: data.corporate_name,
			email: data.email ?? null,
			phones: data.phones,
			started_activity_in: data.started_activity_in,
			avatar: null,
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

	async uploadAvatar(
		companyId: string,
		data: { url: string; file_name: string; path: string },
	) {
		const company = await this.findById(companyId);

		if (!company) {
			return null;
		}

		const avatar: CompanyAvatar = {
			id: randomUUID(),
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			created_at: new Date(),
		};

		this.avatars.push(avatar);
		company.avatar = avatar;

		return company;
	}
}
