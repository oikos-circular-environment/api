import { faker } from "@faker-js/faker";
import type {
	CompanyService,
	CompanyServiceInput,
	CompanyWaste,
	CompanyWasteInput,
} from "@/modules/companies/dtos/companies-dto.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";

export function makeCompanyWasteInput(
	overrides?: Partial<CompanyWasteInput>,
): CompanyWasteInput {
	return {
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 0.5, max: 100, fractionDigits: 2 }),
		unit: "KG",
		waste_category_id: faker.string.uuid(),
		quantity: faker.number.float({ min: 1, max: 1000, fractionDigits: 1 }),
		observations: null,
		...overrides,
	};
}

export function makeCompanyWaste(overrides?: Partial<CompanyWaste>): CompanyWaste {
	const category = makeWasteCategory();
	return {
		id: faker.string.uuid(),
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 0.5, max: 100, fractionDigits: 2 }),
		unit: "KG",
		waste_category_id: category.id,
		waste_category: category,
		quantity: faker.number.float({ min: 1, max: 1000, fractionDigits: 1 }),
		observations: null,
		created_at: faker.date.past(),
		updated_at: faker.date.past(),
		...overrides,
	};
}

export function makeCompanyServiceInput(
	overrides?: Partial<CompanyServiceInput>,
): CompanyServiceInput {
	return {
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
		unit: "UNIT",
		waste_category_id: faker.string.uuid(),
		quantity: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
		observations: null,
		...overrides,
	};
}

export function makeCompanyService(
	overrides?: Partial<CompanyService>,
): CompanyService {
	const category = makeWasteCategory();
	return {
		id: faker.string.uuid(),
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
		unit: "UNIT",
		waste_category_id: category.id,
		waste_category: category,
		quantity: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
		observations: null,
		created_at: faker.date.past(),
		updated_at: faker.date.past(),
		...overrides,
	};
}
