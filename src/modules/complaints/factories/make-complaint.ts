import { faker } from "@faker-js/faker";
import type {
	CreateComplaint,
	Geospatial,
} from "@/modules/complaints/dtos/complaints-dto.js";

export function makeGeospatial(overrides?: Partial<Geospatial>): Geospatial {
	return {
		heading: {
			trueHeading: faker.number.float({ min: 0, max: 360 }),
			magHeading: faker.number.float({ min: 0, max: 360 }),
			accuracy: faker.number.float({ min: 0, max: 5 }),
		},
		location: {
			coords: {
				latitude: faker.location.latitude(),
				longitude: faker.location.longitude(),
				altitude: null,
				accuracy: null,
				altitudeAccuracy: null,
				heading: null,
				speed: null,
			},
			timestamp: faker.date.recent().getTime(),
		},
		addresses: {
			city: faker.location.city(),
			district: faker.location.county(),
			streetNumber: faker.location.buildingNumber(),
			street: faker.location.street(),
			region: faker.location.state({ abbreviated: true }).slice(0, 2).toUpperCase(),
			subregion: null,
			country: "Brasil",
			postalCode: faker.string.numeric(8),
			name: null,
			isoCountryCode: "BR",
			timezone: "America/Sao_Paulo",
			formattedAddress: faker.location.streetAddress(),
		},
		...overrides,
	};
}

export function makeCreateComplaint(
	overrides?: Partial<CreateComplaint>,
): CreateComplaint {
	return {
		date: faker.date.recent(),
		type: "BURNING",
		observations: faker.lorem.sentence(),
		geospatial: makeGeospatial(),
		...overrides,
	};
}
