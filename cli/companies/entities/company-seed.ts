import type { AddressSeed } from "../../shared/entities/address-seed.js";

export type IdentityType = "CPF" | "CNPJ";

export type CompanyType = "COMPANY" | "ONG" | "GOVERNMENT" | "COLLECTOR";

export type DayOfWeek =
	| "SUNDAY"
	| "MONDAY"
	| "TUESDAY"
	| "WEDNESDAY"
	| "THURSDAY"
	| "FRIDAY"
	| "SATURDAY";

export type Measurement =
	| "DAY"
	| "KG"
	| "L"
	| "UNIT"
	| "M"
	| "M2"
	| "M3"
	| "ML";

export interface TimeSlotSeed {
	start_time: string;
	end_time: string;
}

export interface BusinessHourSeed {
	day_of_week: DayOfWeek;
	is_open: boolean;
	time_slots: TimeSlotSeed[];
}

export interface WasteSeed {
	name: string;
	description: string | null;
	price: number;
	unit: Measurement;
	waste_category_name: string;
	quantity: number;
}

export interface ServiceSeed {
	name: string;
	description: string | null;
	price: number;
	unit: Measurement;
	waste_category_name: string;
	quantity: number;
}

export interface CompanySeedSource {
	google_place_id: string | null;
	rating: number | null;
	types: string[];
	is_ecoponto: boolean;
	synthetic: boolean;
}

/**
 * Posse é estrutural, não indexada — uma `CompanySeed` só existe aninhada em
 * `UserSeed.companies` (ver `company-owner-assigner.ts`), nunca solta com um
 * ponteiro pro dono.
 */
export interface CompanySeed {
	_source: CompanySeedSource;
	corporate_name: string;
	business_name: string | null;
	identity: string;
	identity_type: IdentityType;
	company_type: CompanyType;
	status: boolean;
	email: string | null;
	phones: string[];
	website: string | null;
	started_activity_in: string;
	address: AddressSeed;
	business_hours: BusinessHourSeed[];
	wastes: WasteSeed[];
	services: ServiceSeed[];
}
