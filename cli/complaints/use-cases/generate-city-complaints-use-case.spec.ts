import { describe, expect, it } from "vitest";
import type { CompanySeed } from "../../companies/entities/company-seed.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import { ComplaintAttachmentPicker } from "../services/complaint-attachment-picker.js";
import { ComplaintCategoryPicker } from "../services/complaint-category-picker.js";
import { ComplaintGenerator } from "../services/complaint-generator.js";
import { ComplaintStatusPicker } from "../services/complaint-status-picker.js";
import { ResolutionGenerator } from "../services/resolution-generator.js";
import { SyntheticGeospatialGenerator } from "../services/synthetic-geospatial-generator.js";
import { VoteGenerator } from "../services/vote-generator.js";
import { GenerateCityComplaintsUseCase } from "./generate-city-complaints-use-case.js";

const CTX: CityContext = {
	city: "Rondonópolis",
	cityIbgeId: 5107602,
	state: "Mato Grosso",
	stateIbgeId: 51,
	stateCode: "MT",
	bounds: {
		low: { latitude: -16.72, longitude: -54.78 },
		high: { latitude: -16.22, longitude: -54.35 },
	},
	center: { latitude: -16.47, longitude: -54.63 },
};

function makeUsers(count: number): UserSeed[] {
	return Array.from({ length: count }, (_, i) => ({
		full_name: `Usuário ${i}`,
		display_name: `U${i}`,
		phone: "(65) 91234-5678",
		email: `usuario-${i}@oikos.seed`,
		address: {
			zip_code: "78000-000",
			street: "Rua A",
			number: "1",
			complement: null,
			district: "Centro",
			city: "Rondonópolis",
			city_ibge_id: 5107602,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: -16.47,
			longitude: -54.63,
		},
		companies: [],
		complaints: [],
	}));
}

function makeCompany(): CompanySeed {
	return {
		_source: {
			google_place_id: null,
			rating: null,
			types: [],
			is_ecoponto: false,
			synthetic: true,
		},
		corporate_name: "Empresa",
		business_name: null,
		identity: "12345678000100",
		identity_type: "CNPJ",
		company_type: "COMPANY",
		status: true,
		email: null,
		phones: [],
		website: null,
		started_activity_in: "2020-01-01",
		address: {
			zip_code: "78000-000",
			street: "Rua A",
			number: "1",
			complement: null,
			district: "Centro",
			city: "Rondonópolis",
			city_ibge_id: 5107602,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: -16.47,
			longitude: -54.63,
		},
		business_hours: [],
		wastes: [],
		services: [],
	};
}

function makeUseCase(): GenerateCityComplaintsUseCase {
	const complaintGenerator = new ComplaintGenerator(
		new ComplaintCategoryPicker(),
		new ComplaintAttachmentPicker(["a.jpg"]),
		new SyntheticGeospatialGenerator(),
		new ComplaintStatusPicker(),
		new VoteGenerator(),
		new ResolutionGenerator(),
	);

	return new GenerateCityComplaintsUseCase(complaintGenerator);
}

function totalComplaints(byUser: Map<number, unknown[]>): number {
	let total = 0;
	for (const complaints of byUser.values()) total += complaints.length;
	return total;
}

describe("generate-city-complaints-use-case", () => {
	it("generateComplaints returns exactly `target` complaints across all users", () => {
		const useCase = makeUseCase();
		const users = makeUsers(15);

		const complaintsByUser = useCase.generateComplaints(
			CTX,
			users,
			new Set(),
			15,
		);

		expect(totalComplaints(complaintsByUser)).toBe(15);
	});

	describe("computeUsersWithCompany", () => {
		it("returns an empty set when there are no companies", () => {
			const useCase = makeUseCase();

			const result = useCase.computeUsersWithCompany(new Map());

			expect(result.size).toBe(0);
		});

		it("returns the user-index set from the in-memory owned-companies map", () => {
			const useCase = makeUseCase();
			const ownedCompaniesByUser = new Map<number, CompanySeed[]>([
				[2, [makeCompany()]],
				[5, [makeCompany(), makeCompany()]],
			]);

			const result = useCase.computeUsersWithCompany(ownedCompaniesByUser);

			expect(result).toStrictEqual(new Set([2, 5]));
		});
	});
});
