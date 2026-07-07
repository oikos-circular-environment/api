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
	/** Índice em `CityResidentsFile.residents` — nunca mais de 2 empresas apontam
	 * para o mesmo morador (ver `company-owner-assigner.ts`). Preenchido só ao
	 * final do pipeline de geração (`GenerateCitySeedUseCase`), depois que a
	 * lista de empresas está fechada (reais + sintéticas + reparadas). */
	owner_resident_index: number;
}

/**
 * Shape produzido por mapper/gerador/repairer, ANTES da atribuição de dono —
 * `owner_resident_index` só é conhecido depois que a lista final de empresas
 * (reais + sintéticas + reparadas) está fechada (ver `CompanyOwnerAssigner`).
 */
export type UnownedCompanySeed = Omit<CompanySeed, "owner_resident_index">;

export interface SeedFileMeta {
	generated_at: string;
	total: number;
	city: string;
	state_code: string;
	queries_used: string[];
}

export interface SeedFile {
	_meta: SeedFileMeta;
	companies: CompanySeed[];
}
