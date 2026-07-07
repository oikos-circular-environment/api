import type { BusinessHourSeed, DayOfWeek } from "../entities/company-seed.js";
import type { GoogleOpeningHours } from "../entities/google-place.js";

const DAY_MAP: Record<number, DayOfWeek> = {
	0: "SUNDAY",
	1: "MONDAY",
	2: "TUESDAY",
	3: "WEDNESDAY",
	4: "THURSDAY",
	5: "FRIDAY",
	6: "SATURDAY",
};

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

function formatTime(hour: number, minute: number): string {
	return `${pad(hour)}:${pad(minute)}`;
}

export class GoogleBusinessHoursParser {
	/** Agrupa múltiplos períodos do mesmo dia (turnos manhã/tarde) numa única entrada. */
	parse(hours?: GoogleOpeningHours): BusinessHourSeed[] {
		if (!hours?.periods?.length) return [];

		const byDay = new Map<number, { start_time: string; end_time: string }[]>();

		for (const period of hours.periods) {
			if (!byDay.has(period.open.day)) byDay.set(period.open.day, []);
			if (period.close) {
				byDay.get(period.open.day)?.push({
					start_time: formatTime(period.open.hour, period.open.minute),
					end_time: formatTime(period.close.hour, period.close.minute),
				});
			}
		}

		return Array.from(byDay.entries()).map(([day, time_slots]) => ({
			day_of_week: DAY_MAP[day],
			is_open: true,
			time_slots,
		}));
	}
}
