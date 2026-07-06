import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "../../src/generated/prisma/client.js";

const SEEDS_DIR = resolve("prisma/seeds/recycling-companies");

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
}

interface SeedFile {
	_meta: { total: number; generated_at: string };
	companies: CompanySeed[];
}

function loadAllCompanies(): CompanySeed[] {
	if (!existsSync(SEEDS_DIR)) {
		console.error(`Diretório de dados não encontrado: ${SEEDS_DIR}`);
		console.error(
			"Execute primeiro: npx tsx scripts/recycling-companies/index.ts --city=<cidade> --state=<uf>",
		);
		process.exit(1);
	}

	const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));
	const companies: CompanySeed[] = [];

	for (const file of files) {
		const { companies: fileCompanies, _meta }: SeedFile = JSON.parse(
			readFileSync(resolve(SEEDS_DIR, file), "utf-8"),
		);
		console.log(
			`  ${file}: ${_meta.total} empresas (gerado em ${_meta.generated_at})`,
		);
		companies.push(...fileCompanies);
	}

	return companies;
}

// ─── seed ─────────────────────────────────────────────────────────────────────

export async function seedRecyclingCompanies(prisma: PrismaClient) {
	console.log("Carregando arquivos de seed:");
	const companies = loadAllCompanies();
	console.log(`\nIniciando seed — ${companies.length} empresas no total\n`);

	const passwordHash = await bcrypt.hash("Seed@123456", 10);

	// Carrega categorias de resíduos para resolver nomes em IDs
	const wasteCategories = await prisma.wasteCategory.findMany({
		select: { id: true, name: true },
	});
	const categoryByName = new Map(wasteCategories.map((c) => [c.name, c.id]));

	for (let i = 0; i < companies.length; i++) {
		const data = companies[i];
		const slug = data.corporate_name
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/\s+/g, ".")
			.replace(/[^a-z0-9.]/g, "");

		const email = `${slug}.${i + 1}@oikos.seed`;
		process.stdout.write(
			`  [${i + 1}/${companies.length}] ${data.corporate_name}`,
		);

		// Idempotência: pula empresa já inserida em execuções anteriores
		const existing = await prisma.company.findUnique({
			where: { identity: data.identity },
		});
		if (existing) {
			process.stdout.write(" ↷ (já existe)\n");
			continue;
		}

		// Agrupa business_hours por dia para respeitar o unique constraint
		const groupedHours = new Map<string, BusinessHour>();
		for (const bh of data.business_hours) {
			if (!groupedHours.has(bh.day_of_week)) {
				groupedHours.set(bh.day_of_week, {
					...bh,
					time_slots: [...bh.time_slots],
				});
			} else {
				groupedHours.get(bh.day_of_week)?.time_slots.push(...bh.time_slots);
			}
		}

		try {
			await prisma.$transaction(async (tx) => {
				const user = await tx.user.create({
					data: { email, password: passwordHash },
				});

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
						is_company_valid: true,
						user_id: user.id,
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
					if (!categoryId) continue;
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
					if (!categoryId) continue;
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
						general_registration: true,
						address: true,
						business_hours: groupedHours.size > 0,
						wastes: data.wastes.length > 0,
						services: data.services.length > 0,
					},
				});
			});

			process.stdout.write(" ✓\n");
		} catch (err) {
			process.stdout.write(` ✗ (${(err as Error).message})\n`);
		}
	}

	console.log("\nSeed concluído.");
}
