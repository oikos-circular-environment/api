import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { ResolveComplaintUseCase } from "./resolve-complaint-use-case.js";

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

const USER_ID = "11111111-1111-1111-1111-111111111111";

const resolution = {
	description: "Problema resolvido pela prefeitura",
	resolver: "Prefeitura de SP",
	rating: 5,
};

describe("resolve-complaint-use-case", () => {
	it("registers resolution and vote when resolving a complaint", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date("2026-04-20T10:00:00.000Z"), type: "BURNING", observations: null, geospatial },
			"AUTOMATIC",
		);

		await sut.execute({ userId: USER_ID, complaintId: created.id, resolution });

		expect(complaintsRepository.resolutions).toHaveLength(1);
		expect(complaintsRepository.resolutions[0].description).toBe(resolution.description);
		expect(complaintsRepository.votes).toHaveLength(1);
		expect(complaintsRepository.votes[0].vote_type).toBe("RESOLVED");
	});

	it("throws when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				resolution,
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

	it("throws 422 COMPLAINT_CLOSED when complaint is already RESOLVED", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new ResolveComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
			"AUTOMATIC",
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(USER_ID, created.id, "RESOLVED");

		let thrownError: unknown;
		try {
			await sut.execute({ userId: USER_ID, complaintId: created.id, resolution });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(422);
			expect(thrownError.code).toBe("COMPLAINT_CLOSED");
		}
	});

	it("calls job dispatcher with the complaint id", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const dispatchQuorumJob = vi.fn().mockResolvedValue(undefined);
		const jobDispatcher = { dispatchGroupingJob: vi.fn(), dispatchQuorumJob };
		const sut = new ResolveComplaintUseCase(complaintsRepository, jobDispatcher);

		const created = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
			"AUTOMATIC",
		);

		await sut.execute({ userId: USER_ID, complaintId: created.id, resolution });

		expect(dispatchQuorumJob).toHaveBeenCalledWith(created.id);
	});
});
