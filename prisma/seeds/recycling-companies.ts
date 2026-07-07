import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
	companyGeneralRegistrationValidationSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../src/modules/companies/dtos/companies-dto.js";
import { upsertCityResident } from "./shared/upsert-city-resident.js";

const SEEDS_DIR = resolve("prisma/seeds/recycling-companies");
const RESIDENTS_DIR = resolve("prisma/seeds/city-residents");
const DEFAULT_SEED_PASSWORD = "Seed@123456";

// ─── tipos do JSON gerado pelo script de fetch ────────────────────────────────

interface TimeSlot {
	start_time: string;
	end_time: string;
}

interface BusinessHour {
	day_of_week: string;
	is_open: boolean;
	time_slots: TimeSlot[];
}

interface Address {
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	city_ibge_id: number;
	state: string;
	state_ibge_id: number;
	state_code: string;
	latitude: number | null;
	longitude: number | null;
}

interface WasteOrServiceItem {
	name: string;
	description: string | null;
	price: number;
	unit: string;
	waste_category_name: string;
	quantity: number;
}

interface CompanySeed {
	corporate_name: string;
	business_name: string | null;
	identity: string;
	identity_type: string;
	company_type: string;
	status: boolean;
	email: string | null;
	phones: string[];
	started_activity_in: string;
	address: Address;
	business_hours: BusinessHour[];
	wastes: WasteOrServiceItem[];
	services: WasteOrServiceItem[];
	/** Ausente em arquivos gerados antes da introdução do pool de moradores
	 * compartilhado — nesse caso cai no fallback legado (ver `seedRecyclingCompanies`). */
	owner_resident_index?: number;
}

interface SeedFile {
	_meta: { total: number; generated_at: string };
	companies: CompanySeed[];
}

interface CityResidentAddress {
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	district: string;
	city: string;
	city_ibge_id: number;
	state: string;
	state_ibge_id: number;
	state_code: string;
	latitude: number;
	longitude: number;
}

interface CityResidentSeed {
	full_name: string;
	display_name: string;
	phone: string;
	email: string;
	address: CityResidentAddress;
}

interface CityResidentsFile {
	residents: CityResidentSeed[];
}

interface CompanyFileEntry {
	slug: string;
	companies: CompanySeed[];
}

function loadAllCompanyFiles(): CompanyFileEntry[] {
	if (!existsSync(SEEDS_DIR)) {
		console.error(`Diretório de dados não encontrado: ${SEEDS_DIR}`);
		console.error(
			"Execute primeiro: npx tsx cli/index.ts --city=<cidade> --state=<uf>",
		);
		process.exit(1);
	}

	const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));

	return files.map((file) => {
		const { companies, _meta }: SeedFile = JSON.parse(
			readFileSync(resolve(SEEDS_DIR, file), "utf-8"),
		);
		console.log(
			`  ${file}: ${_meta.total} empresas (gerado em ${_meta.generated_at})`,
		);
		return { slug: file.replace(/\.json$/, ""), companies };
	});
}

/** Retorna `[]` se a cidade nunca teve um pool de moradores gerado (ex.: arquivo legado). */
function loadResidentsForSlug(slug: string): CityResidentSeed[] {
	const path = resolve(RESIDENTS_DIR, `${slug}.json`);
	if (!existsSync(path)) return [];

	const parsed: CityResidentsFile = JSON.parse(readFileSync(path, "utf-8"));
	return parsed.residents;
}

function groupBusinessHoursByDay(
	businessHours: BusinessHour[],
): Map<string, BusinessHour> {
	const grouped = new Map<string, BusinessHour>();

	for (const bh of businessHours) {
		if (!grouped.has(bh.day_of_week)) {
			grouped.set(bh.day_of_week, { ...bh, time_slots: [...bh.time_slots] });
		} else {
			grouped.get(bh.day_of_week)?.time_slots.push(...bh.time_slots);
		}
	}

	return grouped;
}

/** Formata os primeiros issues de um ZodError numa linha curta para log. */
function formatZodIssues(error: {
	issues: { path: PropertyKey[]; message: string }[];
}): string {
	return error.issues
		.slice(0, 3)
		.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
		.join("; ");
}

function legacyFallbackEmail(corporateName: string, index: number): string {
	const slug = corporateName
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, ".")
		.replace(/[^a-z0-9.]/g, "");
	return `${slug}.${index}@oikos.seed`;
}

// ─── seed ─────────────────────────────────────────────────────────────────────

export async function seedRecyclingCompanies(prisma: PrismaClient) {
	const dryRun = process.env.SEED_DRY_RUN === "true";
	const seedPassword = process.env.SEED_USER_PASSWORD ?? DEFAULT_SEED_PASSWORD;

	if (dryRun) {
		console.log("[DRY RUN] Nenhuma escrita será feita no banco.\n");
	}

	console.log("Carregando arquivos de seed:");
	const companyFiles = loadAllCompanyFiles();
	const totalCompanies = companyFiles.reduce(
		(sum, file) => sum + file.companies.length,
		0,
	);
	console.log(`\nIniciando seed — ${totalCompanies} empresas no total\n`);

	const passwordHash = await bcrypt.hash(seedPassword, 10);

	// Carrega categorias de resíduos para resolver nomes em IDs
	const wasteCategories = await prisma.wasteCategory.findMany({
		select: { id: true, name: true },
	});
	const categoryByName = new Map(wasteCategories.map((c) => [c.name, c.id]));

	const counters = {
		created: 0,
		skippedExisting: 0,
		skippedInvalid: 0,
		failed: 0,
	};

	let processed = 0;

	for (const file of companyFiles) {
		const residents = loadResidentsForSlug(file.slug);

		for (const data of file.companies) {
			processed++;
			process.stdout.write(
				`  [${processed}/${totalCompanies}] ${data.corporate_name}`,
			);

			// Agrupa business_hours por dia para respeitar o unique constraint
			const groupedHours = groupBusinessHoursByDay(data.business_hours);

			// Validação prévia contra os schemas Zod — roda antes da checagem de
			// idempotência (não vale a pena consultar o banco para dado inválido).
			const generalRegistrationResult =
				companyGeneralRegistrationValidationSchema.safeParse(data);
			const addressResult = upsertCompanyAddressSchema.safeParse(data.address);
			const businessHoursResult = upsertCompanyBusinessHoursSchema.safeParse({
				business_hours: Array.from(groupedHours.values()),
			});

			if (
				!generalRegistrationResult.success ||
				!addressResult.success ||
				!businessHoursResult.success
			) {
				const reason =
					(!generalRegistrationResult.success &&
						formatZodIssues(generalRegistrationResult.error)) ||
					(!addressResult.success && formatZodIssues(addressResult.error)) ||
					(!businessHoursResult.success &&
						formatZodIssues(businessHoursResult.error)) ||
					"motivo desconhecido";

				process.stdout.write(` ✗ (dado inválido: ${reason})\n`);
				counters.skippedInvalid++;
				continue;
			}

			// Idempotência: pula empresa já inserida em execuções anteriores
			const existing = await prisma.company.findUnique({
				where: { identity: data.identity },
			});
			if (existing) {
				process.stdout.write(" ↷ (já existe)\n");
				counters.skippedExisting++;
				continue;
			}

			if (dryRun) {
				process.stdout.write(" ✓ (dry run)\n");
				counters.created++;
				continue;
			}

			// Flags de validação — mesma fórmula de computeIsCompanyValid() em
			// src/modules/companies/utils/company-validation-utils.ts. Mantidas
			// inline (não importadas) para evitar um objeto CompanyValidation
			// completo (exigiria id/company_id fictícios só para satisfazer o
			// tipo) — as duas devem ser mantidas em sincronia manualmente.
			const generalRegistrationValid = true;
			const addressValid = true;
			const businessHoursValid = groupedHours.size > 0;
			const wastesValid = data.wastes.length > 0;
			const servicesValid = data.services.length > 0;
			const isCompanyValid =
				generalRegistrationValid &&
				addressValid &&
				businessHoursValid &&
				(wastesValid || servicesValid);

			try {
				await prisma.$transaction(async (tx) => {
					// Dono real (morador do pool compartilhado) quando o arquivo tem
					// owner_resident_index E o pool de moradores da cidade existe;
					// senão, fallback legado — usuário descartável por empresa.
					const resident =
						data.owner_resident_index !== undefined
							? residents[data.owner_resident_index]
							: undefined;

					const userId = resident
						? (await upsertCityResident(tx, resident, passwordHash)).userId
						: (
								await tx.user.create({
									data: {
										email: legacyFallbackEmail(data.corporate_name, processed),
										password: passwordHash,
									},
								})
							).id;

					const address = await tx.address.create({
						data: {
							zip_code: data.address.zip_code,
							street: data.address.street,
							number: data.address.number,
							complement: data.address.complement,
							district: data.address.district,
							city: data.address.city,
							city_ibge_id: data.address.city_ibge_id,
							state: data.address.state,
							state_ibge_id: data.address.state_ibge_id,
							state_code: data.address.state_code,
							latitude: data.address.latitude ?? 0,
							longitude: data.address.longitude ?? 0,
						},
					});

					if (data.address.latitude != null && data.address.longitude != null) {
						await tx.$executeRaw`
							UPDATE "addresses"
							SET "location" = ST_SetSRID(ST_Point(${data.address.longitude}, ${data.address.latitude}), 4326)
							WHERE "id" = ${address.id}
						`;
					}

					const company = await tx.company.create({
						data: {
							corporate_name: data.corporate_name,
							business_name: data.business_name ?? data.corporate_name,
							identity: data.identity,
							identity_type: data.identity_type as "CNPJ" | "CPF",
							company_type: data.company_type as
								| "COMPANY"
								| "ONG"
								| "GOVERNMENT"
								| "COLLECTOR",
							status: data.status,
							email: data.email,
							phones: data.phones,
							started_activity_in: new Date(data.started_activity_in),
							is_company_valid: isCompanyValid,
							user_id: userId,
							address_id: address.id,
						},
					});

					for (const bh of groupedHours.values()) {
						await tx.companyBusinessHour.create({
							data: {
								company_id: company.id,
								day_of_week: bh.day_of_week as "MONDAY",
								is_open: bh.is_open,
								time_slots: {
									create: bh.time_slots.map((slot) => ({
										start_time: slot.start_time,
										end_time: slot.end_time,
									})),
								},
							},
						});
					}

					for (const w of data.wastes) {
						const categoryId = categoryByName.get(w.waste_category_name);
						if (!categoryId) {
							console.warn(
								`    ⚠ categoria "${w.waste_category_name}" não encontrada — resíduo "${w.name}" ignorado`,
							);
							continue;
						}
						await tx.companyWaste.create({
							data: {
								company_id: company.id,
								name: w.name,
								description: w.description,
								price: w.price,
								unit: w.unit as
									| "KG"
									| "UNIT"
									| "DAY"
									| "L"
									| "M"
									| "M2"
									| "M3"
									| "ML",
								waste_category_id: categoryId,
								quantity: w.quantity,
							},
						});
					}

					for (const s of data.services) {
						const categoryId = categoryByName.get(s.waste_category_name);
						if (!categoryId) {
							console.warn(
								`    ⚠ categoria "${s.waste_category_name}" não encontrada — serviço "${s.name}" ignorado`,
							);
							continue;
						}
						await tx.companyService.create({
							data: {
								company_id: company.id,
								name: s.name,
								description: s.description,
								price: s.price,
								unit: s.unit as
									| "KG"
									| "UNIT"
									| "DAY"
									| "L"
									| "M"
									| "M2"
									| "M3"
									| "ML",
								waste_category_id: categoryId,
								quantity: s.quantity,
							},
						});
					}

					await tx.companyValidation.create({
						data: {
							company_id: company.id,
							general_registration: generalRegistrationValid,
							address: addressValid,
							business_hours: businessHoursValid,
							wastes: wastesValid,
							services: servicesValid,
						},
					});
				});

				process.stdout.write(" ✓\n");
				counters.created++;
			} catch (err) {
				process.stdout.write(` ✗ (${(err as Error).message})\n`);
				counters.failed++;
			}
		}
	}

	console.log(`\n${dryRun ? "[DRY RUN] " : ""}Resumo:`);
	console.log(`  Criadas: ${counters.created}`);
	console.log(`  Já existiam: ${counters.skippedExisting}`);
	console.log(`  Inválidas (schema): ${counters.skippedInvalid}`);
	console.log(`  Falharam (erro no banco): ${counters.failed}`);
	console.log(`  Total processado: ${totalCompanies}`);
	console.log("\nSeed concluído.");
}
