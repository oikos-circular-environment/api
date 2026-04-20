import { randomUUID } from "node:crypto";
import type {
	CompanyAddressesRepository,
	CompanyAddressRelation,
} from "../company-addresses-repository.js";

type StoredCompanyAddressRelation = CompanyAddressRelation & {
	company_id: string;
	address_id: string;
};

export class InMemoryCompanyAddressesRepository
	implements CompanyAddressesRepository
{
	public items: StoredCompanyAddressRelation[] = [];

	async findByCompanyId(companyId: string) {
		const relation = this.items.find((item) => item.company_id === companyId);

		return relation ?? null;
	}

	async create(data: { company_id: string; address_id: string }) {
		const now = new Date();
		const relation: StoredCompanyAddressRelation = {
			id: randomUUID(),
			company_id: data.company_id,
			address_id: data.address_id,
			created_at: now,
			updated_at: now,
		};

		this.items.push(relation);

		return relation;
	}
}
