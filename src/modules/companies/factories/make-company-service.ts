import { randomUUID } from "node:crypto";
import { faker } from "@faker-js/faker";
import type { CompanyService } from "@/modules/companies/dtos/companies-dto.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";

export function makeCompanyService(
	overrides?: Partial<CompanyService>,
): CompanyService {
	const category = makeWasteCategory();
	return {
		id: randomUUID(),
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
		unit: "UNIT",
		waste_category_id: category.id,
		waste_category: category,
		quantity: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}
