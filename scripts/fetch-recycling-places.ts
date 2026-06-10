/**
 * Busca empresas de reciclagem em Rondonópolis-MT via Google Places API (nova)
 * e gera um arquivo JSON pronto para uso como seed de testes.
 *
 * Uso:
 *   GOOGLE_PLACES_API_KEY=<sua-chave> npx tsx prisma/seeds/fetch-recycling-places.ts
 *
 * Output: prisma/seeds/recycling-companies.json
 *
 * Se o arquivo de output já existir, nenhuma requisição é feita — os dados
 * em cache são utilizados diretamente.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

const OUT_PATH = resolve("prisma/seeds/recycling-companies.json");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY env var is required");
const BASE_URL = "https://places.googleapis.com/v1";

const RONDONOPOLIS_BOUNDS = {
	low: { latitude: -16.72, longitude: -54.78 },
	high: { latitude: -16.22, longitude: -54.35 },
};

const CITY = "Rondonópolis";
const STATE = "Mato Grosso";
const STATE_CODE = "MT";
const CITY_IBGE_ID = 5107602;
const STATE_IBGE_ID = 51;

// ─── tipos auxiliares ────────────────────────────────────────────────────────

interface GooglePeriodTime {
	day: number;
	hour: number;
	minute: number;
}

interface GooglePeriod {
	open: GooglePeriodTime;
	close?: GooglePeriodTime;
}

interface GoogleOpeningHours {
	periods?: GooglePeriod[];
}

interface GoogleLocation {
	latitude: number;
	longitude: number;
}

interface GooglePlace {
	id: string;
	displayName?: { text: string };
	formattedAddress?: string;
	location?: GoogleLocation;
	nationalPhoneNumber?: string;
	internationalPhoneNumber?: string;
	websiteUri?: string;
	rating?: number;
	regularOpeningHours?: GoogleOpeningHours;
	currentOpeningHours?: GoogleOpeningHours;
	businessStatus?: string;
	types?: string[];
}

// ─── mapeamento de enums ─────────────────────────────────────────────────────

const DAY_MAP: Record<number, string> = {
	0: "SUNDAY",
	1: "MONDAY",
	2: "TUESDAY",
	3: "WEDNESDAY",
	4: "THURSDAY",
	5: "FRIDAY",
	6: "SATURDAY",
};

function pad(n: number) {
	return String(n).padStart(2, "0");
}

function formatTime(hour: number, minute: number) {
	return `${pad(hour)}:${pad(minute)}`;
}

// ─── chamadas à API ──────────────────────────────────────────────────────────

const TEXT_SEARCH_FIELD_MASK = [
	"places.id",
	"places.displayName",
	"places.formattedAddress",
	"places.location",
	"places.nationalPhoneNumber",
	"places.internationalPhoneNumber",
	"places.websiteUri",
	"places.rating",
	"places.regularOpeningHours",
	"places.businessStatus",
	"places.types",
].join(",");

async function textSearch(
	query: string,
	pageToken?: string,
): Promise<{ places: GooglePlace[]; nextPageToken?: string }> {
	const body: Record<string, unknown> = {
		textQuery: query,
		locationRestriction: { rectangle: RONDONOPOLIS_BOUNDS },
		languageCode: "pt-BR",
		regionCode: "BR",
		pageSize: 20,
	};

	if (pageToken) body.pageToken = pageToken;

	const res = await fetch(`${BASE_URL}/places:searchText`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Goog-Api-Key": API_KEY,
			"X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(`Text Search falhou [${res.status}]: ${await res.text()}`);
	}

	return res.json() as Promise<{
		places: GooglePlace[];
		nextPageToken?: string;
	}>;
}

const DETAIL_FIELD_MASK = [
	"id",
	"displayName",
	"formattedAddress",
	"addressComponents",
	"location",
	"nationalPhoneNumber",
	"internationalPhoneNumber",
	"websiteUri",
	"rating",
	"userRatingCount",
	"regularOpeningHours",
	"businessStatus",
	"types",
	"editorialSummary",
].join(",");

async function placeDetails(placeId: string): Promise<GooglePlace> {
	const res = await fetch(`${BASE_URL}/places/${placeId}?languageCode=pt-BR`, {
		headers: {
			"X-Goog-Api-Key": API_KEY,
			"X-Goog-FieldMask": DETAIL_FIELD_MASK,
		},
	});

	if (!res.ok) {
		throw new Error(
			`Place Details falhou para ${placeId} [${res.status}]: ${await res.text()}`,
		);
	}

	return res.json() as Promise<GooglePlace>;
}

// ─── parsing ─────────────────────────────────────────────────────────────────

function parseAddress(place: GooglePlace) {
	const raw = place.formattedAddress ?? "";

	// Formato típico BR: "Rua X, 123 - Bairro, Rondonópolis - MT, 78700-000, Brasil"
	const zipMatch = raw.match(/(\d{5}-\d{3})/);
	const zipCode = zipMatch ? zipMatch[1] : "00000-000";

	const segments = raw
		.replace(zipCode, "")
		.split(" - ")
		.map((s) => s.trim().replace(/,$/, "").trim());

	const streetParts = (segments[0] ?? "").split(",").map((s) => s.trim());
	const street = streetParts[0] ?? raw;
	const number = streetParts[1] ?? "S/N";
	const district = segments[1] ?? "Centro";

	return {
		zip_code: zipCode,
		street,
		number,
		complement: null,
		district,
		city: CITY,
		city_ibge_id: CITY_IBGE_ID,
		state: STATE,
		state_ibge_id: STATE_IBGE_ID,
		state_code: STATE_CODE,
		latitude: place.location?.latitude ?? null,
		longitude: place.location?.longitude ?? null,
	};
}

function parseBusinessHours(hours?: GoogleOpeningHours) {
	if (!hours?.periods?.length) return [];

	// O Google pode retornar múltiplos períodos para o mesmo dia (turnos manhã/tarde).
	// Agrupamos por dia para respeitar o unique constraint (company_id, day_of_week).
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

function defaultWastes() {
	return [
		{
			name: "Papel e Papelão",
			description: "Jornais, revistas, caixas, embalagens de papel",
			price: "0.50",
			unit: "KG",
			waste_type: "RECYCLABLE",
			quantity: "0.00",
			observations: null,
			sub_items: ["jornal", "revista", "papelão", "papel branco"],
		},
		{
			name: "Plástico",
			description: "PET, PEAD, PVC e demais plásticos recicláveis",
			price: "0.80",
			unit: "KG",
			waste_type: "RECYCLABLE",
			quantity: "0.00",
			observations: null,
			sub_items: ["PET", "PEAD", "PVC", "PP", "PS"],
		},
		{
			name: "Metal",
			description: "Latas de alumínio, ferro, aço",
			price: "2.50",
			unit: "KG",
			waste_type: "RECYCLABLE",
			quantity: "0.00",
			observations: null,
			sub_items: ["alumínio", "ferro", "aço", "cobre"],
		},
		{
			name: "Vidro",
			description: "Garrafas, potes e cacos de vidro",
			price: "0.20",
			unit: "KG",
			waste_type: "RECYCLABLE",
			quantity: "0.00",
			observations: null,
			sub_items: ["garrafa", "pote", "vidro temperado"],
		},
	];
}

function mapToSeed(place: GooglePlace, index: number) {
	const phone =
		place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null;

	return {
		_source: {
			google_place_id: place.id,
			rating: place.rating ?? null,
			types: place.types ?? [],
		},
		corporate_name:
			place.displayName?.text ?? `Empresa de Reciclagem ${index + 1}`,
		business_name: place.displayName?.text ?? null,
		identity: `00.000.${String(index + 1).padStart(3, "0")}.0001-00`,
		identity_type: "CNPJ",
		company_type: "COMPANY",
		status: place.businessStatus === "OPERATIONAL",
		is_headquarters: false,
		accept_appointments: false,
		email: null,
		phones: phone ? [phone] : [],
		website: place.websiteUri ?? null,
		started_activity_in: new Date("2010-01-01").toISOString(),
		address: parseAddress(place),
		business_hours: parseBusinessHours(
			place.regularOpeningHours ?? place.currentOpeningHours,
		),
		wastes: defaultWastes(),
		services: [],
	};
}

// ─── orquestração ─────────────────────────────────────────────────────────────

async function fetchAllPlaces(query: string): Promise<GooglePlace[]> {
	const places: GooglePlace[] = [];
	let pageToken: string | undefined;

	do {
		const result = await textSearch(query, pageToken);
		if (result.places?.length) places.push(...result.places);
		pageToken = result.nextPageToken;
		if (pageToken) await new Promise((r) => setTimeout(r, 200));
	} while (pageToken);

	return places;
}

async function fetchAndSave() {
	if (!API_KEY) {
		console.error("Defina GOOGLE_PLACES_API_KEY antes de executar.");
		process.exit(1);
	}

	console.log("Buscando empresas de reciclagem em Rondonópolis-MT...\n");

	const queries = [
		"reciclagem",
		"cooperativa reciclagem",
		"ferro velho",
		"sucata",
	];
	const seenIds = new Set<string>();
	const allPlaces: GooglePlace[] = [];

	for (const query of queries) {
		console.log(`  → query: "${query}"`);
		const results = await fetchAllPlaces(query);
		for (const p of results) {
			if (!seenIds.has(p.id)) {
				seenIds.add(p.id);
				allPlaces.push(p);
			}
		}
	}

	console.log(`\nTotal único encontrado: ${allPlaces.length} lugares`);
	console.log("Buscando detalhes de cada um...\n");

	const detailed: GooglePlace[] = [];
	for (let i = 0; i < allPlaces.length; i++) {
		const place = allPlaces[i];
		process.stdout.write(
			`  [${i + 1}/${allPlaces.length}] ${place.displayName?.text ?? place.id}`,
		);
		try {
			const detail = await placeDetails(place.id);
			detailed.push({ ...place, ...detail });
			process.stdout.write(" ✓\n");
		} catch (err) {
			process.stdout.write(` ✗ (${(err as Error).message})\n`);
			detailed.push(place);
		}

		if (i < allPlaces.length - 1) await new Promise((r) => setTimeout(r, 100));
	}

	const seeds = detailed.map(mapToSeed);

	const output = {
		_meta: {
			generated_at: new Date().toISOString(),
			total: seeds.length,
			source: "Google Places API (nova)",
			city: CITY,
			state_code: STATE_CODE,
			queries_used: queries,
			note: "CNPJs são fictícios — substitua por dados reais antes de usar em produção.",
		},
		companies: seeds,
	};

	writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
	console.log(`\nSeed salvo em: ${OUT_PATH}`);
	console.log(`Total de empresas: ${seeds.length}`);
}

// ─── entry point ─────────────────────────────────────────────────────────────

async function main() {
	if (existsSync(OUT_PATH)) {
		const cached = JSON.parse(readFileSync(OUT_PATH, "utf-8"));
		console.log(
			`Arquivo já existe (gerado em ${cached._meta?.generated_at ?? "?"})`,
		);
		console.log(
			`Usando cache: ${cached._meta?.total ?? "?"} empresas — nenhuma requisição feita.`,
		);
		console.log(`Para forçar nova busca, remova: ${OUT_PATH}`);
		return;
	}

	await fetchAndSave();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
