import { faker } from "@faker-js/faker";
import type { BusinessHourSeed, DayOfWeek } from "../entities/company-seed.js";
import type { GooglePlace } from "../entities/google-place.js";
import { GoogleBusinessHoursParser } from "./business-hours-parser.js";
import { generateFakePhone } from "../../shared/services/fake-phone.js";

export interface GapFillResult {
	phones: string[];
	email: string;
	business_hours: BusinessHourSeed[];
}

function slugify(text: string): string {
	const slug = text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, ".")
		.replace(/^\.+|\.+$/g, "");

	return slug || "empresa";
}

const WEEKDAYS: DayOfWeek[] = [
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
];

/** Também reutilizado por synthetic-company-generator.ts para empresas 100% fake. */
export function generateSyntheticHours(): BusinessHourSeed[] {
	const hours: BusinessHourSeed[] = WEEKDAYS.map((day) => ({
		day_of_week: day,
		is_open: true,
		time_slots: [{ start_time: "08:00", end_time: "18:00" }],
	}));

	if (faker.datatype.boolean()) {
		hours.push({
			day_of_week: "SATURDAY",
			is_open: true,
			time_slots: [{ start_time: "08:00", end_time: "12:00" }],
		});
	}

	return hours;
}

/**
 * Completa apenas o que o Google não retorna. Nunca substitui um dado real
 * — só age quando o campo está ausente/vazio (ver 01-technical-plan.md).
 */
export class CompanyGapFiller {
	constructor(
		private readonly businessHoursParser: GoogleBusinessHoursParser = new GoogleBusinessHoursParser(),
	) {}

	fill(place: GooglePlace): GapFillResult {
		const realPhone =
			place.nationalPhoneNumber ?? place.internationalPhoneNumber;
		const phones = realPhone ? [realPhone] : [generateFakePhone()];

		const email = this.generateEmail(place.displayName?.text ?? "empresa");

		const parsedHours = this.businessHoursParser.parse(
			place.regularOpeningHours ?? place.currentOpeningHours,
		);
		const business_hours =
			parsedHours.length > 0 ? parsedHours : generateSyntheticHours();

		return { phones, email, business_hours };
	}

	private generateEmail(name: string): string {
		return `${slugify(name)}@${faker.internet.domainName()}`;
	}
}
