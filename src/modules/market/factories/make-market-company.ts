import { faker } from "@faker-js/faker";
import type { MarketCompany, MarketItem } from "@/modules/market/dtos/market-dto.js";

// Coordenadas padrão próximas ao centro de Rondonópolis (~3.3km do ponto de referência usado nos testes)
const DEFAULT_LAT = -16.4757009;
const DEFAULT_LON = -54.6684927;

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

export function makeMarketCompany(
	overrides?: Partial<MarketCompany>,
): MarketCompany {
	return {
		id: faker.string.uuid(),
		business_name: faker.company.name(),
		corporate_name: `${faker.company.name()} LTDA`,
		company_type: "COMPANY",
		accept_appointments: false,
		status: true,
		address: {
			id: faker.string.uuid(),
			zip_code: faker.string.numeric(8),
			street: faker.location.street(),
			number: faker.location.buildingNumber(),
			complement: null,
			district: faker.location.county(),
			city: "Rondonópolis",
			state: "Mato Grosso",
			state_code: "MT",
			latitude: DEFAULT_LAT,
			longitude: DEFAULT_LON,
		},
		phones: [faker.string.numeric(11)],
		services: [],
		wastes: [],
		business_hours: [],
		distance_in_meters: 0,
		...overrides,
	};
}
