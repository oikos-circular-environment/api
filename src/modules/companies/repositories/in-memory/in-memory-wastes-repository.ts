import { randomUUID } from "node:crypto";
import type {
	CompanyWaste,
	CompanyWasteInput,
} from "../../dtos/companies-dto.js";
import type { WastesRepository } from "../wastes-repository.js";

type StoredWaste = CompanyWaste & { company_id: string };

function normalizeSubItems(subItems: string[] | null | undefined) {
	if (!subItems || subItems.length === 0) {
		return null;
	}

	return subItems;
}

export class InMemoryWastesRepository implements WastesRepository {
	public items: StoredWaste[] = [];

	async findByCompanyId(companyId: string) {
		return this.items
			.filter((item) => item.company_id === companyId)
			.sort(
				(left, right) => left.created_at.getTime() - right.created_at.getTime(),
			)
			.map(({ company_id: _companyId, ...waste }) => waste);
	}

	async replaceMany(companyId: string, data: CompanyWasteInput[]) {
		const now = new Date();
		this.items = this.items.filter((item) => item.company_id !== companyId);

		const storedItems = data.map((item, index) => ({
			id: randomUUID(),
			name: item.name,
			description: item.description,
			price: item.price,
			unit: item.unit,
			waste_type: item.waste_type,
			quantity: item.quantity,
			observations: item.observations,
			sub_items: normalizeSubItems(item.sub_items),
			created_at: new Date(now.getTime() + index),
			updated_at: new Date(now.getTime() + index),
			company_id: companyId,
		}));

		this.items.push(...storedItems);

		return this.findByCompanyId(companyId);
	}
}
