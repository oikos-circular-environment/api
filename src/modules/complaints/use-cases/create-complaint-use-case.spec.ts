import { describe, expect, it } from "vitest";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { InMemoryUsersRepository } from "@/modules/users/repositories/in-memory/in-memory-users-repositories.js";
import { CreateComplaintUseCase } from "./create-complaint-use-case.js";

const geospatial: Geospatial = {
	heading: {
		trueHeading: 10,
		magHeading: 11,
		accuracy: 1,
	},
	location: {
		coords: {
			latitude: -23.55,
			longitude: -46.63,
			altitude: null,
			accuracy: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null,
		},
		timestamp: 1711111111111,
	},
	addresses: {
		city: "Sao Paulo",
		district: "Centro",
		streetNumber: "100",
		street: "Rua A",
		region: "SP",
		subregion: null,
		country: "Brasil",
		postalCode: "01000-000",
		name: null,
		isoCountryCode: "BR",
		timezone: "America/Sao_Paulo",
		formattedAddress: "Rua A, 100 - Centro",
	},
};

describe("create-complaint-use-case", () => {
	it("creates complaint with OPEN status for user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const usersRepository = new InMemoryUsersRepository();
		const sut = new CreateComplaintUseCase(
			complaintsRepository,
			usersRepository,
		);

		await usersRepository.create({
			email: "user@example.com",
			password: "123456",
		});

		const user = usersRepository.items[0];

		const result = await sut.execute({
			userId: user?.id ?? "",
			data: {
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: "Fumaca intensa",
				geospatial,
			},
		});

		expect(result.id.length > 0).toBe(true);
		expect(result.status).toBe("OPEN");
		expect(result.type).toBe("BURNING");
		expect(result.observations).toBe("Fumaca intensa");
		expect(result.geospatial).toStrictEqual(geospatial);
		expect(result.attachment).toBeNull();
	});
});
