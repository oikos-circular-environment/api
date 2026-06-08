import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { CompanyWaste } from "@/modules/companies/dtos/companies-dto.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";

export function makeCompanyWaste(overrides?: Partial<CompanyWaste>): CompanyWaste {
	const category = makeWasteCategory();
	return {
		id: randomUUID(),
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 0.5, max: 100, fractionDigits: 2 }),
		unit: "KG",
		waste_category_id: category.id,
		waste_category: category,
		quantity: faker.number.float({ min: 1, max: 1000, fractionDigits: 1 }),
		observations: null,
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}
