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
	/**
	 * Mirrors the `Member` table for specs — maps organization_id to the user ids
	 * that belong to it. Defaults to `[company.user_id]` for every company added via
	 * `create()`, since today only the owner (creator) is ever a member.
	 */
	public memberships: Map<string, Set<string>> = new Map();

	async findById(id: string) {
		const company = this.items.find((item) => item.id === id);

		return company ?? null;
	}

	async findByUserId(userId: string) {
		return this.items.filter((item) => item.user_id === userId);
	}

	async findByUserAndCompanyId(userId: string, companyId: string) {
		const company = this.items.find((item) => item.id === companyId);

		if (!company) {
			return null;
		}

		const members = this.memberships.get(company.organization_id);
		// No explicit membership registered for this organization (common in specs that
		// push a company straight into `.items`) — fall back to the creator, since today
		// the owner is always the only member.
		const isMember = members ? members.has(userId) : company.user_id === userId;

		if (!isMember) {
			return null;
		}

		return company;
	}

	async create(data: CreateCompany) {
		const now = new Date();
		const company = {
			id: randomUUID(),
			user_id: data.user_id,
			organization_id: data.organization_id,
			identity: data.identity,
			identity_type: data.identity_type,
			company_type: data.company_type,
			status: data.status,
			business_name: data.business_name,
			corporate_name: data.corporate_name,
			email: data.email ?? null,
			phones: data.phones,
			started_activity_in: data.started_activity_in,
			is_company_valid: false,
			avatar: null,
			created_at: now,
			updated_at: now,
		} satisfies Company;

		this.items.push(company);

		const members = this.memberships.get(company.organization_id) ?? new Set();
		members.add(data.user_id);
		this.memberships.set(company.organization_id, members);

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
