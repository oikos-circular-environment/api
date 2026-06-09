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
	wastes: unknown[];
}

interface SeedFile {
	_meta: { total: number; generated_at: string };
	companies: CompanySeed[];
}

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

				// Company wastes are not seeded from JSON — waste_type/sub_items removed.
				// Use the app or a dedicated waste seed to associate company wastes.
			});

			process.stdout.write(" ✓\n");
		} catch (err) {
			process.stdout.write(` ✗ (${(err as Error).message})\n`);
		}
	}

	console.log("\nSeed concluído.");
}
