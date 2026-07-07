import { describe, expect, it } from "vitest";
import type { GoogleOpeningHours } from "../entities/google-place.js";
import { GoogleBusinessHoursParser } from "./business-hours-parser.js";

describe("business-hours-parser", () => {
	const parser = new GoogleBusinessHoursParser();

	it("returns an empty array when there are no periods", () => {
		expect(parser.parse(undefined)).toEqual([]);
		expect(parser.parse({})).toEqual([]);
		expect(parser.parse({ periods: [] })).toEqual([]);
	});

	it("groups multiple periods on the same day into one entry", () => {
		const hours: GoogleOpeningHours = {
			periods: [
				{
					open: { day: 1, hour: 8, minute: 0 },
					close: { day: 1, hour: 12, minute: 0 },
				},
				{
					open: { day: 1, hour: 13, minute: 30 },
					close: { day: 1, hour: 18, minute: 0 },
				},
			],
		};

		const result = parser.parse(hours);

		expect(result).toHaveLength(1);
		expect(result[0].day_of_week).toBe("MONDAY");
		expect(result[0].is_open).toBe(true);
		expect(result[0].time_slots).toStrictEqual([
			{ start_time: "08:00", end_time: "12:00" },
			{ start_time: "13:30", end_time: "18:00" },
		]);
	});

	it("maps every weekday correctly and pads single-digit hours/minutes", () => {
		const hours: GoogleOpeningHours = {
			periods: [
				{
					open: { day: 0, hour: 9, minute: 5 },
					close: { day: 0, hour: 17, minute: 0 },
				},
			],
		};

		const result = parser.parse(hours);

		expect(result[0].day_of_week).toBe("SUNDAY");
		expect(result[0].time_slots[0]).toStrictEqual({
			start_time: "09:05",
			end_time: "17:00",
		});
	});

	it("skips periods without a close time", () => {
		const hours: GoogleOpeningHours = {
			periods: [{ open: { day: 2, hour: 8, minute: 0 } }],
		};

		const result = parser.parse(hours);

		expect(result).toHaveLength(1);
		expect(result[0].time_slots).toStrictEqual([]);
	});
});
