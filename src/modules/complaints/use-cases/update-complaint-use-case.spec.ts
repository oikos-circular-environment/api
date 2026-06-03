import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { UpdateComplaintUseCase } from "./update-complaint-use-case.js";

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

describe("update-complaint-use-case", () => {
	it("updates complaint observations", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: "Inicial",
				geospatial,
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { observations: "Atualizada" },
		});

		expect(result.id).toBe(created.id);
		expect(result.observations).toBe("Atualizada");
	});

	it("updates complaint type", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { type: "DEFORESTATION" },
		});

		expect(result.type).toBe("DEFORESTATION");
	});

	it("updates complaint geospatial", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const updatedGeospatial: Geospatial = {
			...geospatial,
			addresses: { ...geospatial.addresses, city: "Rio de Janeiro" },
		};

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { geospatial: updatedGeospatial },
		});

		expect(result.geospatial.addresses.city).toBe("Rio de Janeiro");
	});

	it("updates complaint date", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			"11111111-1111-1111-1111-111111111111",
			{
				date: new Date("2026-04-20T10:00:00.000Z"),
				type: "BURNING",
				observations: null,
				geospatial,
			},
		);

		const newDate = new Date("2026-05-01T08:00:00.000Z");
		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			complaintId: created.id,
			data: { date: newDate },
		});

		expect(result.date).toEqual(newDate);
	});

	it("throws when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new UpdateComplaintUseCase(complaintsRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				data: { observations: "Nova observacao" },
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Complaint not found");
			expect(thrownError.code).toBe("COMPLAINT_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
