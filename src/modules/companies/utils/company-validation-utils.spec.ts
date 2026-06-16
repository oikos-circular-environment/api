import { describe, expect, it } from "vitest";
import type {
	CompanyValidation,
	DayOfWeek,
} from "@/modules/companies/dtos/companies-dto.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { makeCompanyAddress } from "@/modules/companies/factories/make-company-address.js";
import { makeCompanyService } from "@/modules/companies/factories/make-company-service.js";
import { makeCompanyWaste } from "@/modules/companies/factories/make-company-waste.js";
import {
	computeIsCompanyValid,
	isAddressValid,
	isBusinessHoursValid,
	isGeneralRegistrationValid,
	isServicesValid,
	isWastesValid,
} from "./company-validation-utils.js";

const baseValidation: CompanyValidation = {
	id: "v1",
	company_id: "1",
	general_registration: true,
	address: true,
	business_hours: true,
	wastes: false,
	services: true,
};

describe("is-general-registration-valid", () => {
	it("returns true for a complete company", () => {
		expect(isGeneralRegistrationValid(makeCompany())).toBe(true);
	});

	it("returns false when phones is empty", () => {
		expect(isGeneralRegistrationValid(makeCompany({ phones: [] }))).toBe(false);
	});

	it("returns false when business_name is empty", () => {
		expect(isGeneralRegistrationValid(makeCompany({ business_name: "" }))).toBe(
			false,
		);
	});

	it("returns false when corporate_name is empty", () => {
		expect(
			isGeneralRegistrationValid(makeCompany({ corporate_name: "" })),
		).toBe(false);
	});

	it("returns false when identity is empty", () => {
		expect(isGeneralRegistrationValid(makeCompany({ identity: "" }))).toBe(
			false,
		);
	});
});

describe("is-address-valid", () => {
	it("returns true for a complete address with lat/lng", () => {
		expect(isAddressValid(makeCompanyAddress())).toBe(true);
	});

	it("returns false when address is null", () => {
		expect(isAddressValid(null)).toBe(false);
	});
});

describe("is-business-hours-valid", () => {
	const makeHour = (
		day:
			| "SUNDAY"
			| "MONDAY"
			| "TUESDAY"
			| "WEDNESDAY"
			| "THURSDAY"
			| "FRIDAY"
			| "SATURDAY",
		is_open: boolean,
		slots: { start_time: string; end_time: string }[],
	) => ({
		id: day,
		day_of_week: day as DayOfWeek,
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

describe("is-wastes-valid", () => {
	it("returns true when at least one waste with valid category exists", () => {
		expect(isWastesValid([makeCompanyWaste()])).toBe(true);
	});

	it("returns false when array is empty", () => {
		expect(isWastesValid([])).toBe(false);
	});
});

describe("is-services-valid", () => {
	it("returns true when at least one service with valid category exists", () => {
		expect(isServicesValid([makeCompanyService()])).toBe(true);
	});

	it("returns false when array is empty", () => {
		expect(isServicesValid([])).toBe(false);
	});
});

describe("compute-is-company-valid", () => {
	it("returns true when all fields are valid and wastes is true", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				wastes: true,
				services: false,
			}),
		).toBe(true);
	});

	it("returns true when all fields are valid and services is true", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				wastes: false,
				services: true,
			}),
		).toBe(true);
	});

	it("returns true when all fields are valid and both wastes and services are true", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				wastes: true,
				services: true,
			}),
		).toBe(true);
	});

	it("returns false when wastes and services are both false", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				wastes: false,
				services: false,
			}),
		).toBe(false);
	});

	it("returns false when general_registration is false", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				general_registration: false,
				wastes: true,
			}),
		).toBe(false);
	});

	it("returns false when address is false", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				address: false,
				wastes: true,
			}),
		).toBe(false);
	});

	it("returns false when business_hours is false", () => {
		expect(
			computeIsCompanyValid({
				...baseValidation,
				business_hours: false,
				wastes: true,
			}),
		).toBe(false);
	});
});
