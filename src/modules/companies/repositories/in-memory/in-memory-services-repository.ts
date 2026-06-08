import { randomUUID } from "node:crypto";
import type {
	CompanyService,
	CompanyServiceInput,
} from "../../dtos/companies-dto.js";
import type { WasteCategory } from "@/modules/wastes/dtos/wastes-dto.js";
import type { ServicesRepository } from "../services-repository.js";

type StoredService = CompanyService & { company_id: string };

const STUB_CATEGORY: WasteCategory = {
	id: "00000000-0000-0000-0000-000000000000",
	name: "Stub Category",
	description: null,
	observations: null,
	hazard_levels: ["LOW"],
	created_at: new Date(0),
	updated_at: new Date(0),
	subcategories: [],
};

export class InMemoryServicesRepository implements ServicesRepository {
	public items: StoredService[] = [];
	public categoryMap: Map<string, WasteCategory> = new Map();

	async findByCompanyId(companyId: string) {
		return this.items
			.filter((item) => item.company_id === companyId)
			.sort(
				(left, right) => left.created_at.getTime() - right.created_at.getTime(),
			)
			.map(({ company_id: _companyId, ...service }) => service);
	}

	async replaceMany(companyId: string, data: CompanyServiceInput[]) {
		const now = new Date();
		this.items = this.items.filter((item) => item.company_id !== companyId);

		const storedItems = data.map((item, index) => ({
			id: randomUUID(),
			name: item.name,
			description: item.description ?? null,
			price: item.price,
			unit: item.unit,
			quantity: item.quantity,
			observations: item.observations ?? null,
			waste_category_id: item.waste_category_id,
			waste_category: this.categoryMap.get(item.waste_category_id) ?? {
				...STUB_CATEGORY,
				id: item.waste_category_id,
			},
			created_at: new Date(now.getTime() + index),
			updated_at: new Date(now.getTime() + index),
			company_id: companyId,
		}));

		this.items.push(...storedItems);

		return this.findByCompanyId(companyId);
	}
}
