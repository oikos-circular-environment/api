import { describe, expect, it } from "vitest";
import type { GooglePlace } from "../entities/google-place.js";
import { CompanyGapFiller } from "./company-gap-filler.js";

describe("company-gap-filler", () => {
	const filler = new CompanyGapFiller();

	it("keeps the real phone and business hours when Google provides them", () => {
		const place: GooglePlace = {
			id: "1",
			displayName: { text: "Recicla Fácil" },
			nationalPhoneNumber: "(66) 99999-0000",
			regularOpeningHours: {
				periods: [
					{
						open: { day: 1, hour: 8, minute: 0 },
						close: { day: 1, hour: 18, minute: 0 },
					},
				],
			},
		};

		const result = filler.fill(place);

		expect(result.phones).toStrictEqual(["(66) 99999-0000"]);
		expect(result.business_hours).toHaveLength(1);
		expect(result.business_hours[0].day_of_week).toBe("MONDAY");
	});

	it("generates a synthetic phone when Google provides none", () => {
		const place: GooglePlace = {
			id: "2",
			displayName: { text: "Recicla Fácil" },
		};

		const result = filler.fill(place);

		expect(result.phones).toHaveLength(1);
		expect(result.phones[0]).toMatch(/^\(\d{2}\) 9\d{4}-\d{4}$/);
	});

	it("always generates a synthetic email (Google never provides one)", () => {
		const place: GooglePlace = {
			id: "3",
			displayName: { text: "Recicla Fácil" },
		};

		const result = filler.fill(place);

		expect(result.email).toMatch(/^[a-z0-9.]+@.+$/);
	});

	it("generates a valid synthetic schedule when Google provides no hours", () => {
		const place: GooglePlace = {
			id: "4",
			displayName: { text: "Recicla Fácil" },
		};

		const result = filler.fill(place);

		expect(result.business_hours.length).toBeGreaterThanOrEqual(5);
		for (const day of result.business_hours) {
			expect(day.is_open).toBe(true);
			expect(day.time_slots.length).toBeGreaterThan(0);
			for (const slot of day.time_slots) {
				expect(slot.start_time < slot.end_time).toBe(true);
			}
		}
	});
});
