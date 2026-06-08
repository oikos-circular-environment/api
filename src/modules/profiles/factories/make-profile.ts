import { faker } from "@faker-js/faker";
import type { CreateAddress, CreateProfile } from "@/modules/profiles/dtos/profiles-dto.js";

export function makeProfileInput(overrides?: Partial<CreateProfile>): CreateProfile {
	return {
		user_id: faker.string.uuid(),
		full_name: faker.person.fullName(),
		display_name: faker.internet.username(),
		phone: faker.string.numeric(11),
		...overrides,
	};
}

export function makeAddressInput(overrides?: Partial<Omit<CreateAddress, "profile_id">>): Omit<CreateAddress, "profile_id"> {
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
