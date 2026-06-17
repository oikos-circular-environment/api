import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "../../src/generated/prisma/client.js";

const DATA_PATH = resolve("prisma/seeds/recycling-companies.json");

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
}

interface SeedFile {
	_meta: { total: number; generated_at: string };
	companies: CompanySeed[];
}

// ─── resíduos e serviços padrão para empresas de reciclagem ──────────────────

const DEFAULT_WASTES = [
	{
		name: "Papel e Papelão",
		description: "Jornais, revistas, caixas, embalagens de papel",
		price: 0.5,
		unit: "KG",
		waste_category_name: "Papel / Papelão",
		quantity: 500,
	},
	{
		name: "Plástico",
		description: "PET, PEAD, PVC e demais plásticos recicláveis",
		price: 0.8,
		unit: "KG",
		waste_category_name: "Plástico",
		quantity: 300,
	},
	{
		name: "Metal e Alumínio",
		description: "Latas de alumínio, ferro, aço e sucata metálica",
		price: 2.5,
		unit: "KG",
		waste_category_name: "Metal / Alumínio",
		quantity: 200,
	},
	{
		name: "Vidro",
		description: "Garrafas, potes e cacos de vidro",
		price: 0.2,
		unit: "KG",
		waste_category_name: "Vidro",
		quantity: 300,
	},
] as const;

const DEFAULT_SERVICES = [
	{
		name: "Coleta de Papel e Papelão",
		description: "Serviço de coleta e transporte de resíduos de papel",
		price: 80.0,
		unit: "UNIT",
		waste_category_name: "Papel / Papelão",
		quantity: 1,
	},
	{
		name: "Coleta de Plástico",
		description: "Serviço de coleta e transporte de resíduos plásticos",
		price: 100.0,
		unit: "UNIT",
		waste_category_name: "Plástico",
		quantity: 1,
	},
	{
		name: "Coleta de Metal",
		description: "Coleta de sucata metálica e alumínio",
		price: 150.0,
		unit: "UNIT",
		waste_category_name: "Metal / Alumínio",
		quantity: 1,
	},
] as const;

// ─── seed ─────────────────────────────────────────────────────────────────────

export async function seedRecyclingCompanies(prisma: PrismaClient) {
	if (!existsSync(DATA_PATH)) {
		console.error(`Arquivo de dados não encontrado: ${DATA_PATH}`);
		console.error(
			"Execute primeiro: npx tsx scripts/fetch-recycling-places.ts",
		);
		process.exit(1);
	}

	const { companies, _meta }: SeedFile = JSON.parse(
		readFileSync(DATA_PATH, "utf-8"),
	);
	console.log(
		`Iniciando seed — ${_meta.total} empresas (gerado em ${_meta.generated_at})\n`,
	);

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
			.replace(/[̀-ͯ]/g, "")
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
		// (necessário para JSONs gerados antes da correção do script de fetch)
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
						latitude: data.address.latitude,
						longitude: data.address.longitude,
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

				for (const w of DEFAULT_WASTES) {
					const categoryId = categoryByName.get(w.waste_category_name);
					if (!categoryId) continue;
					await tx.companyWaste.create({
						data: {
							company_id: company.id,
							name: w.name,
							description: w.description,
							price: w.price,
							unit: w.unit,
							waste_category_id: categoryId,
							quantity: w.quantity,
						},
					});
				}

				for (const s of DEFAULT_SERVICES) {
					const categoryId = categoryByName.get(s.waste_category_name);
					if (!categoryId) continue;
					await tx.companyService.create({
						data: {
							company_id: company.id,
							name: s.name,
							description: s.description,
							price: s.price,
							unit: s.unit,
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
						wastes: true,
						services: true,
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
