import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryComplaintsRepository } from "@/modules/complaints/repositories/in-memory/in-memory-complaints-repository.js";
import { makeGeospatial } from "@/modules/complaints/factories/make-complaint.js";
import { GetPublicComplaintUseCase } from "./get-public-complaint-use-case.js";

const USER_A = "11111111-1111-1111-1111-111111111111";

// Fixed SP coordinates for location assertions
const spGeospatial = makeGeospatial({
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
});

describe("get-public-complaint-use-case", () => {
	it("returns the public complaint when it exists", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetPublicComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "BURNING", observations: "some obs", geospatial: spGeospatial },
		);

		const result = await sut.execute({ complaintId: created.id });

		expect(result.id).toBe(created.id);
		expect(result.type).toBe("BURNING");
		expect(result.status).toBe("OPEN");
		expect(result.location).toEqual({ lat: -23.55, lon: -46.63 });
		expect(result.attachments).toHaveLength(0);
		expect(result.resolutions).toHaveLength(0);
		expect(result.vote_counts).toEqual({ resolved: 0, not_resolved: 0 });
	});

	it("throws AppError 404 when complaint does not exist", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetPublicComplaintUseCase(complaintsRepository);

		await expect(
			sut.execute({ complaintId: "00000000-0000-0000-0000-000000000000" }),
		).rejects.toThrowError(AppError);

		await expect(
			sut.execute({ complaintId: "00000000-0000-0000-0000-000000000000" }),
		).rejects.toMatchObject({ statusCode: 404, code: "COMPLAINT_NOT_FOUND" });
	});

	it("includes resolutions with anonymous resolver identity", async () => {
		const complaintsRepository = new InMemoryComplaintsRepository();
		const sut = new GetPublicComplaintUseCase(complaintsRepository);

		const created = await complaintsRepository.createForUser(
			USER_A,
			{ date: new Date(), type: "VACANT_LOT", observations: null, geospatial: makeGeospatial() },
		);

		complaintsRepository.resolutions.push({
			id: "res-1",
			complaint_id: created.id,
			resolver_user_id: USER_A,
			description: "Cleaned up",
			company_id: null,
			created_at: new Date(),
			updated_at: new Date(),
		});

		const result = await sut.execute({ complaintId: created.id });

		expect(result.resolutions).toHaveLength(1);
		const resolution = result.resolutions[0];
		expect(resolution?.description).toBe("Cleaned up");
		expect(resolution?.attachments).toHaveLength(0);
		expect(resolution?.resolver).toMatchObject({
			type: "profile",
			full_name: "Anonymous",
			display_name: "Anonymous",
			avatar_url: null,
		});
	});
});
