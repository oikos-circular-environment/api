import { faker } from "@faker-js/faker";
import type { MarketItem } from "@/modules/market/dtos/market-dto.js";

export function makeMarketItem(overrides?: Partial<MarketItem>): MarketItem {
	const categoryId = faker.string.uuid();
	return {
		id: faker.string.uuid(),
		name: faker.commerce.productName(),
		description: null,
		price: faker.number.float({ min: 0.5, max: 100, fractionDigits: 2 }),
		unit: "KG",
		waste_category_id: categoryId,
		waste_category: {
			id: categoryId,
			name: faker.word.words(2),
			hazard_levels: ["LOW"],
		},
		quantity: faker.number.float({ min: 1, max: 1000, fractionDigits: 1 }),
		observations: null,
		...overrides,
	};
}
