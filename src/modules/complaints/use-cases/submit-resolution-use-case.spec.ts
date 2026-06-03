import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { Geospatial } from "@/modules/complaints/dtos/complaints-dto.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { SubmitResolutionUseCase } from "./submit-resolution-use-case.js";

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
const RESOLVER_USER_ID = "22222222-2222-2222-2222-222222222222";

const resolutionData = {
	description: "Prefeitura recolheu o lixo",
};

describe("submit-resolution-use-case", () => {
	it("creates resolution when it does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);

		await sut.execute({
			userId: RESOLVER_USER_ID,
			complaintId: complaint.id,
			data: resolutionData,
		});

		expect(complaintsRepository.resolutions).toHaveLength(1);
		expect(complaintsRepository.resolutions[0].description).toBe(resolutionData.description);
	});

	it("updates existing resolution instead of creating a duplicate", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);

		await sut.execute({
			userId: RESOLVER_USER_ID,
			complaintId: complaint.id,
			data: resolutionData,
		});

		await sut.execute({
			userId: RESOLVER_USER_ID,
			complaintId: complaint.id,
			data: { ...resolutionData, description: "Atualizado: problema resolvido" },
		});

		expect(complaintsRepository.resolutions).toHaveLength(1);
		expect(complaintsRepository.resolutions[0].description).toBe(
			"Atualizado: problema resolvido",
		);
	});

	it("throws 404 when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		let thrownError: unknown;
		try {
			await sut.execute({
				userId: RESOLVER_USER_ID,
				complaintId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				data: resolutionData,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(404);
			expect(thrownError.code).toBe("COMPLAINT_NOT_FOUND");
		}
	});

	it("throws 403 when company_id does not belong to the user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const companyChecker = { userOwnsCompany: async () => false };
		const sut = new SubmitResolutionUseCase(complaintsRepository, companyChecker);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);

		await expect(
			sut.execute({
				userId: RESOLVER_USER_ID,
				complaintId: complaint.id,
				data: { ...resolutionData, company_id: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff" },
			}),
		).rejects.toThrowError(expect.objectContaining({ code: "COMPANY_NOT_OWNED" }));
	});

	it("accepts company_id when it belongs to the user", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const COMPANY_ID = "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff";
		const companyChecker = { userOwnsCompany: async () => true };
		const sut = new SubmitResolutionUseCase(complaintsRepository, companyChecker);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);

		await expect(
			sut.execute({
				userId: RESOLVER_USER_ID,
				complaintId: complaint.id,
				data: { ...resolutionData, company_id: COMPANY_ID },
			}),
		).resolves.not.toThrow();
		expect(complaintsRepository.resolutions[0]?.company_id).toBe(COMPANY_ID);
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is RESOLVED", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(USER_ID, complaint.id, "RESOLVED");

		let thrownError: unknown;
		try {
			await sut.execute({ userId: RESOLVER_USER_ID, complaintId: complaint.id, data: resolutionData });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);
		if (thrownError instanceof AppError) {
			expect(thrownError.statusCode).toBe(422);
			expect(thrownError.code).toBe("COMPLAINT_CLOSED");
		}
	});

	it("throws 422 COMPLAINT_CLOSED when complaint is CANCELED", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new SubmitResolutionUseCase(complaintsRepository);

		const complaint = await complaintsRepository.createForUser(
			USER_ID,
			{ date: new Date(), type: "BURNING", observations: null, geospatial },
		);
		await complaintsRepository.updateStatusByUserAndComplaintId(USER_ID, complaint.id, "CANCELED");

		await expect(
			sut.execute({ userId: RESOLVER_USER_ID, complaintId: complaint.id, data: resolutionData }),
		).rejects.toThrowError(expect.objectContaining({ code: "COMPLAINT_CLOSED", statusCode: 422 }));
	});
});
