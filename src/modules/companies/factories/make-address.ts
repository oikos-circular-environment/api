import { faker } from "@faker-js/faker";
import type {
	CompanyAddress,
	UpsertCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";

export function makeAddressInput(
	overrides?: Partial<UpsertCompanyAddress>,
): UpsertCompanyAddress {
	return {
		zip_code: faker.string.numeric(8),
		street: faker.location.street(),
		number: faker.location.buildingNumber(),
		complement: null,
		district: faker.location.county(),
		city_ibge_id: faker.number.int({ min: 1000000, max: 9999999 }),
		city: faker.location.city(),
		state_ibge_id: faker.number.int({ min: 10, max: 53 }),
		state: faker.location.state(),
		state_code: faker.location.state({ abbreviated: true }).slice(0, 2).toUpperCase(),
		latitude: faker.location.latitude(),
		longitude: faker.location.longitude(),
		...overrides,
	};
}

export function makeCompanyAddress(
	overrides?: Partial<CompanyAddress>,
): CompanyAddress {
	return {
		id: faker.string.uuid(),
		...makeAddressInput(),
		created_at: faker.date.past(),
		updated_at: faker.date.past(),
		...overrides,
	};
}
