import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import type {
	Prisma,
	PrismaClient,
} from "../../src/generated/prisma/client.js";
import { makeStorageProvider } from "../../src/modules/common/providers/storage/make-storage-provider.js";
import {
	companyGeneralRegistrationValidationSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../src/modules/companies/dtos/companies-dto.js";
import { upsertUser } from "./shared/upsert-user.js";

const DATA_DIR = resolve("prisma/seeds/data-generated");
const ASSETS_DIR = resolve("cli/assets");
const DEFAULT_SEED_PASSWORD = "Seed@123456";

// ─── tipos do JSON único gerado pelo CLI (cli/cli.ts) ─────────────────────────

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

interface TimeSlot {
	start_time: string;
	end_time: string;
}

interface BusinessHour {
	day_of_week: string;
	is_open: boolean;
	time_slots: TimeSlot[];
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

interface ComplaintAttachmentSeed {
	asset_file: string;
	type: "PHOTO";
}

interface VoteSeed {
	voter_email: string;
	vote_type: "RESOLVED" | "NOT_RESOLVED";
}

interface ResolutionSeed {
	resolver_email: string;
	description: string;
	resolution_hint: "PREFER_COMPANY" | "CITIZEN_ONLY";
}

interface ComplaintSeed {
	date: string;
	observations: string | null;
	geospatial: {
		location: { coords: { latitude: number; longitude: number } };
		[key: string]: unknown;
	};
	waste_category_names: string[];
	attachments: ComplaintAttachmentSeed[];
	status: "OPEN" | "RESOLVED" | "CANCELED";
	votes: VoteSeed[];
	resolutions: ResolutionSeed[];
}

interface UserSeed {
	full_name: string;
	display_name: string;
	phone: string;
	email: string;
	address: Address;
	companies: CompanySeed[];
	complaints: ComplaintSeed[];
}

interface CityDataFile {
	_meta: {
		generated_at: string;
		city: string;
		state_code: string;
		users_total: number;
		companies_total: number;
		complaints_total: number;
	};
	users: UserSeed[];
}

interface CityDataFileEntry {
	slug: string;
	data: CityDataFile;
}

/** Estado de um usuário já upsertado nesta execução — permite resolver
 * `voter_email`/`resolver_email`/`owner` sem depender de ordem de array. */
interface SeededUser {
	userId: string;
	companyIds: string[];
}

function loadAllCityDataFiles(): CityDataFileEntry[] {
	if (!existsSync(DATA_DIR)) {
		console.error(`Diretório de dados não encontrado: ${DATA_DIR}`);
		console.error(
			"Execute primeiro: npx tsx cli/index.ts --city=<cidade> --state=<uf>",
		);
		process.exit(1);
	}

	const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

	return files.map((file) => {
		const data: CityDataFile = JSON.parse(
			readFileSync(resolve(DATA_DIR, file), "utf-8"),
		);
		console.log(
			`  ${file}: ${data._meta.users_total} usuários, ${data._meta.companies_total} empresas, ` +
				`${data._meta.complaints_total} denúncias (gerado em ${data._meta.generated_at})`,
		);
		return { slug: file.replace(/\.json$/, ""), data };
	});
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

// ─── seed ─────────────────────────────────────────────────────────────────────

export async function seedGeneratedCityData(prisma: PrismaClient) {
	const dryRun = process.env.SEED_DRY_RUN === "true";
	const seedPassword = process.env.SEED_USER_PASSWORD ?? DEFAULT_SEED_PASSWORD;

	if (dryRun) {
		console.log("[DRY RUN] Nenhuma escrita será feita no banco.\n");
	}

	console.log("Carregando arquivos de seed:");
	const cityFiles = loadAllCityDataFiles();

	const totalCompanies = cityFiles.reduce(
		(sum, file) =>
			sum + file.data.users.reduce((s, u) => s + u.companies.length, 0),
		0,
	);
	const totalComplaints = cityFiles.reduce(
		(sum, file) =>
			sum + file.data.users.reduce((s, u) => s + u.complaints.length, 0),
		0,
	);
	console.log(
		`\nIniciando seed — ${totalCompanies} empresas, ${totalComplaints} denúncias no total\n`,
	);

	const passwordHash = await bcrypt.hash(seedPassword, 10);
	const storageProvider = makeStorageProvider();

	const wasteCategories = await prisma.wasteCategory.findMany({
		select: { id: true, name: true },
	});
	const categoryByName = new Map(wasteCategories.map((c) => [c.name, c.id]));

	const companyCounters = {
		created: 0,
		skippedExisting: 0,
		skippedInvalid: 0,
		failed: 0,
	};
	const complaintCounters = {
		created: 0,
		skippedExisting: 0,
		failed: 0,
	};

	let companiesProcessed = 0;
	let complaintsProcessed = 0;

	for (const { slug, data } of cityFiles) {
		// 1. Usuários + empresas — cada empresa é dona pela própria estrutura
		// (aninhada em `user.companies`), então o `user_id` já está resolvido
		// no momento em que a empresa é criada, sem precisar de índice.
		const userByEmail = new Map<string, SeededUser>();

		for (const user of data.users) {
			let userId = "";
			if (!dryRun) {
				const result = await upsertUser(prisma, user, passwordHash);
				userId = result.userId;
			}

			const companyIds: string[] = [];
			userByEmail.set(user.email, { userId, companyIds });

			for (const company of user.companies) {
				companiesProcessed++;
				process.stdout.write(
					`  [${companiesProcessed}/${totalCompanies}] ${company.corporate_name}`,
				);

				const groupedHours = groupBusinessHoursByDay(company.business_hours);

				const generalRegistrationResult =
					companyGeneralRegistrationValidationSchema.safeParse(company);
				const addressResult = upsertCompanyAddressSchema.safeParse(
					company.address,
				);
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
					companyCounters.skippedInvalid++;
					continue;
				}

				const existing = await prisma.company.findUnique({
					where: { identity: company.identity },
				});
				if (existing) {
					process.stdout.write(" ↷ (já existe)\n");
					companyCounters.skippedExisting++;
					companyIds.push(existing.id);
					continue;
				}

				if (dryRun) {
					process.stdout.write(" ✓ (dry run)\n");
					companyCounters.created++;
					continue;
				}

				const generalRegistrationValid = true;
				const addressValid = true;
				const businessHoursValid = groupedHours.size > 0;
				const wastesValid = company.wastes.length > 0;
				const servicesValid = company.services.length > 0;
				const isCompanyValid =
					generalRegistrationValid &&
					addressValid &&
					businessHoursValid &&
					(wastesValid || servicesValid);

				try {
					const createdCompanyId = await prisma.$transaction(async (tx) => {
						const address = await tx.address.create({
							data: {
								zip_code: company.address.zip_code,
								street: company.address.street,
								number: company.address.number,
								complement: company.address.complement,
								district: company.address.district,
								city: company.address.city,
								city_ibge_id: company.address.city_ibge_id,
								state: company.address.state,
								state_ibge_id: company.address.state_ibge_id,
								state_code: company.address.state_code,
								latitude: company.address.latitude ?? 0,
								longitude: company.address.longitude ?? 0,
							},
						});

						if (
							company.address.latitude != null &&
							company.address.longitude != null
						) {
							await tx.$executeRaw`
								UPDATE "addresses"
								SET "location" = ST_SetSRID(ST_Point(${company.address.longitude}, ${company.address.latitude}), 4326)
								WHERE "id" = ${address.id}
							`;
						}

						const createdCompany = await tx.company.create({
							data: {
								corporate_name: company.corporate_name,
								business_name: company.business_name ?? company.corporate_name,
								identity: company.identity,
								identity_type: company.identity_type as "CNPJ" | "CPF",
								company_type: company.company_type as
									| "COMPANY"
									| "ONG"
									| "GOVERNMENT"
									| "COLLECTOR",
								status: company.status,
								email: company.email,
								phones: company.phones,
								started_activity_in: new Date(company.started_activity_in),
								is_company_valid: isCompanyValid,
								user_id: userId,
								address_id: address.id,
							},
						});

						for (const bh of groupedHours.values()) {
							await tx.companyBusinessHour.create({
								data: {
									company_id: createdCompany.id,
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

						for (const w of company.wastes) {
							const categoryId = categoryByName.get(w.waste_category_name);
							if (!categoryId) {
								console.warn(
									`    ⚠ categoria "${w.waste_category_name}" não encontrada — resíduo "${w.name}" ignorado`,
								);
								continue;
							}
							await tx.companyWaste.create({
								data: {
									company_id: createdCompany.id,
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

						for (const s of company.services) {
							const categoryId = categoryByName.get(s.waste_category_name);
							if (!categoryId) {
								console.warn(
									`    ⚠ categoria "${s.waste_category_name}" não encontrada — serviço "${s.name}" ignorado`,
								);
								continue;
							}
							await tx.companyService.create({
								data: {
									company_id: createdCompany.id,
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
								company_id: createdCompany.id,
								general_registration: generalRegistrationValid,
								address: addressValid,
								business_hours: businessHoursValid,
								wastes: wastesValid,
								services: servicesValid,
							},
						});

						return createdCompany.id;
					});

					companyIds.push(createdCompanyId);
					process.stdout.write(" ✓\n");
					companyCounters.created++;
				} catch (err) {
					process.stdout.write(` ✗ (${(err as Error).message})\n`);
					companyCounters.failed++;
				}
			}
		}

		// 2. Denúncias — autor é o próprio usuário aninhado; votante/resolvedor
		// são resolvidos por email no mapa construído no passo 1 (já cobre
		// TODOS os usuários da cidade, então uma denúncia pode referenciar
		// qualquer um deles, não só quem já foi processado até aqui).
		const totalComplaintsThisCity = data.users.reduce(
			(sum, u) => sum + u.complaints.length,
			0,
		);
		if (totalComplaintsThisCity === 0) continue;

		const seededUserIds = Array.from(userByEmail.values())
			.map((u) => u.userId)
			.filter((id) => id !== "");

		const existingCount =
			seededUserIds.length > 0
				? await prisma.complaint.count({
						where: { user_id: { in: seededUserIds } },
					})
				: 0;

		if (existingCount >= totalComplaintsThisCity) {
			process.stdout.write(
				`  ${slug}: já seedado (${existingCount} denúncias existentes) ↷\n`,
			);
			complaintsProcessed += totalComplaintsThisCity;
			complaintCounters.skippedExisting += totalComplaintsThisCity;
			continue;
		}

		for (const author of data.users) {
			const authorUserId = userByEmail.get(author.email)?.userId ?? "";

			for (const complaint of author.complaints) {
				complaintsProcessed++;
				process.stdout.write(
					`  [${complaintsProcessed}/${totalComplaints}] ${slug}`,
				);

				if (dryRun) {
					process.stdout.write(" ✓ (dry run)\n");
					complaintCounters.created++;
					continue;
				}

				try {
					await prisma.$transaction(async (tx) => {
						const wasteCategoryIds = complaint.waste_category_names
							.map((name) => categoryByName.get(name))
							.filter((id): id is string => id !== undefined);

						const createdComplaint = await tx.complaint.create({
							data: {
								user_id: authorUserId,
								status: complaint.status,
								date: new Date(complaint.date),
								observations: complaint.observations,
								geospatial: complaint.geospatial as Prisma.InputJsonValue,
								waste_categories: {
									create: wasteCategoryIds.map((waste_category_id) => ({
										waste_category_id,
									})),
								},
							},
						});

						const { latitude, longitude } =
							complaint.geospatial.location.coords;
						await tx.$executeRaw`
							UPDATE "complaints"
							SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
							WHERE "id" = ${createdComplaint.id}
						`;

						for (const att of complaint.attachments) {
							const assetPath = resolve(ASSETS_DIR, att.asset_file);
							if (!existsSync(assetPath)) {
								console.warn(
									`    ⚠ asset "${att.asset_file}" não encontrado em ${ASSETS_DIR} — anexo ignorado`,
								);
								continue;
							}

							const fileContent = readFileSync(assetPath);
							const storagePath = `complaints/${createdComplaint.id}/${Date.now()}-${att.asset_file}`;
							const uploaded = await storageProvider.uploadFile(
								storagePath,
								fileContent,
							);
							if (!uploaded) {
								console.warn(
									`    ⚠ upload de "${att.asset_file}" falhou — anexo ignorado`,
								);
								continue;
							}

							const { url } = await storageProvider.getFileUrl(storagePath);
							await tx.complaintAttachment.create({
								data: {
									complaint_id: createdComplaint.id,
									url,
									file_name: att.asset_file,
									path: storagePath,
									base64: fileContent.toString("base64"),
									type: att.type,
								},
							});
						}

						for (const vote of complaint.votes) {
							const voter = userByEmail.get(vote.voter_email);
							if (!voter) {
								console.warn(
									`    ⚠ voto de "${vote.voter_email}" ignorado — usuário não encontrado no arquivo desta cidade`,
								);
								continue;
							}
							await tx.complaintVote.create({
								data: {
									complaint_id: createdComplaint.id,
									user_id: voter.userId,
									vote_type: vote.vote_type,
								},
							});
						}

						// PREFER_COMPANY só vira company_id de verdade se o usuário
						// resolvedor tiver, de fato, criado alguma empresa nesta MESMA
						// execução (passo 1, `companyIds`) — nunca um usuário
						// "emprestando" o company_id de outro dono.
						for (const res of complaint.resolutions) {
							const resolver = userByEmail.get(res.resolver_email);
							if (!resolver) {
								console.warn(
									`    ⚠ resolução de "${res.resolver_email}" ignorada — usuário não encontrado no arquivo desta cidade`,
								);
								continue;
							}

							const companyId =
								res.resolution_hint === "PREFER_COMPANY"
									? (resolver.companyIds[0] ?? null)
									: null;

							await tx.complaintResolution.create({
								data: {
									complaint_id: createdComplaint.id,
									resolver_user_id: resolver.userId,
									description: res.description,
									company_id: companyId,
								},
							});
						}
					});

					process.stdout.write(" ✓\n");
					complaintCounters.created++;
				} catch (err) {
					process.stdout.write(` ✗ (${(err as Error).message})\n`);
					complaintCounters.failed++;
				}
			}
		}
	}

	console.log(`\n${dryRun ? "[DRY RUN] " : ""}Resumo de empresas:`);
	console.log(`  Criadas: ${companyCounters.created}`);
	console.log(`  Já existiam: ${companyCounters.skippedExisting}`);
	console.log(`  Inválidas (schema): ${companyCounters.skippedInvalid}`);
	console.log(`  Falharam (erro no banco): ${companyCounters.failed}`);

	console.log(`\n${dryRun ? "[DRY RUN] " : ""}Resumo de denúncias:`);
	console.log(`  Criadas: ${complaintCounters.created}`);
	console.log(
		`  Já existiam (cidade já seedada): ${complaintCounters.skippedExisting}`,
	);
	console.log(`  Falharam (erro no banco): ${complaintCounters.failed}`);

	console.log("\nSeed concluído.");
}
