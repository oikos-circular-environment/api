import { describe, expect, it } from "vitest";
import type {
	BusinessHour,
	Company,
	CompanyAddress,
	CompanyService,
	CompanyWaste,
	CompanyValidation,
} from "@/modules/companies/dtos/companies-dto.js";
import {
	computeIsCompanyValid,
	isAddressValid,
	isBusinessHoursValid,
	isGeneralRegistrationValid,
	isServicesValid,
	isWastesValid,
} from "./company-validation-utils.js";

const baseCompany: Company = {
	id: "1",
	user_id: "u1",
	identity: "12345678900",
	identity_type: "CPF",
	company_type: "COMPANY",
	status: true,
	business_name: "Oikos Tech",
	corporate_name: "Oikos Tech LTDA",
	email: null,
	phones: ["5511999999999"],
	started_activity_in: new Date("2024-01-01"),
	is_company_valid: false,
	avatar: null,
	created_at: new Date(),
	updated_at: new Date(),
};

const baseAddress: CompanyAddress = {
	id: "a1",
	zip_code: "12345678",
	street: "Main St",
	number: "100",
	complement: null,
	district: "Center",
	city_ibge_id: 3550308,
	city: "Sao Paulo",
	state_ibge_id: 35,
	state: "Sao Paulo",
	state_code: "SP",
	latitude: -23.5505,
	longitude: -46.6333,
	created_at: new Date(),
	updated_at: new Date(),
};

const baseValidation: CompanyValidation = {
	id: "v1",
	company_id: "1",
	general_registration: true,
	address: true,
	business_hours: true,
	wastes: false,
	services: true,
};

describe("isGeneralRegistrationValid", () => {
	it("returns true for a complete company", () => {
		expect(isGeneralRegistrationValid(baseCompany)).toBe(true);
	});

	it("returns false when phones is empty", () => {
		expect(isGeneralRegistrationValid({ ...baseCompany, phones: [] })).toBe(false);
	});

	it("returns false when business_name is empty", () => {
		expect(isGeneralRegistrationValid({ ...baseCompany, business_name: "" })).toBe(false);
	});

	it("returns false when corporate_name is empty", () => {
		expect(isGeneralRegistrationValid({ ...baseCompany, corporate_name: "" })).toBe(false);
	});

	it("returns false when identity is empty", () => {
		expect(isGeneralRegistrationValid({ ...baseCompany, identity: "" })).toBe(false);
	});
});

describe("isAddressValid", () => {
	it("returns true for a complete address with lat/lng", () => {
		expect(isAddressValid(baseAddress)).toBe(true);
	});

	it("returns false when address is null", () => {
		expect(isAddressValid(null)).toBe(false);
	});

	it("returns false when latitude is null", () => {
		expect(isAddressValid({ ...baseAddress, latitude: null })).toBe(false);
	});

	it("returns false when longitude is null", () => {
		expect(isAddressValid({ ...baseAddress, longitude: null })).toBe(false);
	});
});

describe("isBusinessHoursValid", () => {
	const makeHour = (
		day: BusinessHour["day_of_week"],
		is_open: boolean,
		slots: { start_time: string; end_time: string }[],
	): BusinessHour => ({
		id: day,
		day_of_week: day,
		is_open,
		time_slots: slots.map((s, i) => ({ id: `${day}-${i}`, ...s })),
	});

	it("returns true when at least one day is open with a slot", () => {
		expect(
			isBusinessHoursValid([
				makeHour("MONDAY", true, [{ start_time: "08:00", end_time: "17:00" }]),
				makeHour("TUESDAY", false, []),
			]),
		).toBe(true);
	});

	it("returns false when all days are closed", () => {
		expect(
			isBusinessHoursValid([
				makeHour("MONDAY", false, []),
				makeHour("TUESDAY", false, []),
			]),
		).toBe(false);
	});

	it("returns false when empty array is passed", () => {
		expect(isBusinessHoursValid([])).toBe(false);
	});
});

describe("isWastesValid", () => {
	const baseWaste: CompanyWaste = {
		id: "w1",
		name: "Paper",
		description: null,
		price: 10,
		unit: "KG",
		waste_type: "RECYCLABLE",
		quantity: 1,
		observations: null,
		sub_items: null,
		created_at: new Date(),
		updated_at: new Date(),
	};

	it("returns true when at least one waste exists", () => {
		expect(isWastesValid([baseWaste])).toBe(true);
	});

	it("returns false when array is empty", () => {
		expect(isWastesValid([])).toBe(false);
	});
});

describe("isServicesValid", () => {
	const baseService: CompanyService = {
		id: "s1",
		name: "Collection",
		description: null,
		price: 100,
		unit: "UNIT",
		waste_type: "GARBAGE",
		quantity: 1,
		observations: null,
		sub_items: null,
		created_at: new Date(),
		updated_at: new Date(),
	};

	it("returns true when at least one service exists", () => {
		expect(isServicesValid([baseService])).toBe(true);
	});

	it("returns false when array is empty", () => {
		expect(isServicesValid([])).toBe(false);
	});
});

describe("computeIsCompanyValid", () => {
	it("returns true when all fields are valid and wastes is true", () => {
		expect(computeIsCompanyValid({ ...baseValidation, wastes: true, services: false })).toBe(true);
	});

	it("returns true when all fields are valid and services is true", () => {
		expect(computeIsCompanyValid({ ...baseValidation, wastes: false, services: true })).toBe(true);
	});

	it("returns true when all fields are valid and both wastes and services are true", () => {
		expect(computeIsCompanyValid({ ...baseValidation, wastes: true, services: true })).toBe(true);
	});

	it("returns false when wastes and services are both false", () => {
		expect(computeIsCompanyValid({ ...baseValidation, wastes: false, services: false })).toBe(false);
	});

	it("returns false when general_registration is false", () => {
		expect(computeIsCompanyValid({ ...baseValidation, general_registration: false, wastes: true })).toBe(false);
	});

	it("returns false when address is false", () => {
		expect(computeIsCompanyValid({ ...baseValidation, address: false, wastes: true })).toBe(false);
	});

	it("returns false when business_hours is false", () => {
		expect(computeIsCompanyValid({ ...baseValidation, business_hours: false, wastes: true })).toBe(false);
	});
});
