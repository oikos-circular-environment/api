import { faker } from "@faker-js/faker";
import type { MarketCompanyRecord } from "@/modules/market/dtos/market-dto.js";
import { makeMarketItem } from "./make-market-item.js";

// Coordenadas padrão próximas ao centro de Rondonópolis (~3.3km do ponto de referência usado nos testes)
const DEFAULT_LAT = -16.4757009;
const DEFAULT_LON = -54.6684927;

export function makeMarketCompany(
	overrides?: Partial<MarketCompanyRecord>,
): MarketCompanyRecord {
	return {
		id: faker.string.uuid(),
		business_name: faker.company.name(),
		corporate_name: `${faker.company.name()} LTDA`,
		identity: faker.string.numeric(14),
		identity_type: "CNPJ",
		company_type: "COMPANY",
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
		services: [makeMarketItem()],
		wastes: [makeMarketItem()],
		business_hours: [
			{
				id: faker.string.uuid(),
				day_of_week: "MONDAY",
				is_open: true,
				time_slots: [
					{
						id: faker.string.uuid(),
						start_time: "07:00",
						end_time: "17:00",
					},
				],
			},
		],
		distance_in_meters: 0,
		...overrides,
	};
}
