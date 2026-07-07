import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client.js";
import { makeStorageProvider } from "../../src/modules/common/providers/storage/make-storage-provider.js";
import { upsertCityResident } from "./shared/upsert-city-resident.js";

const SEEDS_DIR = resolve("prisma/seeds/complaints");
const RESIDENTS_DIR = resolve("prisma/seeds/city-residents");
const ASSETS_DIR = resolve("cli/assets");
const DEFAULT_SEED_PASSWORD = "Seed@123456";

// ─── tipos do JSON gerado pelo CLI ─────────────────────────────────────────────

interface ComplaintAttachmentSeed {
	asset_file: string;
	type: "PHOTO";
}

interface VoteSeed {
	resident_index: number;
	vote_type: "RESOLVED" | "NOT_RESOLVED";
}

interface ResolutionSeed {
	resident_index: number;
	description: string;
	resolution_hint: "PREFER_COMPANY" | "CITIZEN_ONLY";
}

interface ComplaintSeed {
	author_resident_index: number;
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

interface ComplaintSeedFile {
	_meta: { total: number; generated_at: string };
	complaints: ComplaintSeed[];
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

interface ComplaintFileEntry {
	slug: string;
	complaints: ComplaintSeed[];
}

function loadAllComplaintFiles(): ComplaintFileEntry[] {
	if (!existsSync(SEEDS_DIR)) {
		console.log(
			`Diretório de dados não encontrado: ${SEEDS_DIR} — pulando seed de denúncias.`,
		);
		return [];
	}

	const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));

	return files.map((file) => {
		const { complaints, _meta }: ComplaintSeedFile = JSON.parse(
			readFileSync(resolve(SEEDS_DIR, file), "utf-8"),
		);
		console.log(
			`  ${file}: ${_meta.total} denúncias (gerado em ${_meta.generated_at})`,
		);
		return { slug: file.replace(/\.json$/, ""), complaints };
	});
}

/** `[]` se a cidade nunca teve um pool de moradores gerado — nesse caso, o
 * arquivo de denúncias correspondente é pulado por inteiro (não há como
 * resolver author/votos/resoluções sem o pool). */
function loadResidentsForSlug(slug: string): CityResidentSeed[] {
	const path = resolve(RESIDENTS_DIR, `${slug}.json`);
	if (!existsSync(path)) return [];

	const parsed: CityResidentsFile = JSON.parse(readFileSync(path, "utf-8"));
	return parsed.residents;
}

// ─── seed ─────────────────────────────────────────────────────────────────────

export async function seedComplaints(prisma: PrismaClient) {
	const dryRun = process.env.SEED_DRY_RUN === "true";
	const seedPassword = process.env.SEED_USER_PASSWORD ?? DEFAULT_SEED_PASSWORD;

	if (dryRun) {
		console.log("[DRY RUN] Nenhuma escrita será feita no banco.\n");
	}

	console.log("Carregando arquivos de seed de denúncias:");
	const complaintFiles = loadAllComplaintFiles();
	const totalComplaints = complaintFiles.reduce(
		(sum, file) => sum + file.complaints.length,
		0,
	);
	console.log(`\nIniciando seed — ${totalComplaints} denúncias no total\n`);

	if (totalComplaints === 0) {
		console.log("Nada a fazer.\n");
		return;
	}

	const passwordHash = await bcrypt.hash(seedPassword, 10);
	const storageProvider = makeStorageProvider();

	const wasteCategories = await prisma.wasteCategory.findMany({
		select: { id: true, name: true },
	});
	const categoryByName = new Map(wasteCategories.map((c) => [c.name, c.id]));

	const counters = {
		created: 0,
		skippedExisting: 0,
		skippedNoResidents: 0,
		failed: 0,
	};

	let processed = 0;

	for (const file of complaintFiles) {
		const residents = loadResidentsForSlug(file.slug);

		if (residents.length === 0) {
			console.warn(
				`  ⚠ nenhum pool de moradores encontrado para "${file.slug}" — ${file.complaints.length} denúncia(s) ignorada(s)`,
			);
			processed += file.complaints.length;
			counters.skippedNoResidents += file.complaints.length;
			continue;
		}

		// Idempotência de granularidade por arquivo: sem chave de negócio
		// natural por denúncia (diferente de Company.identity), então
		// comparamos quantas denúncias já existem para os moradores desta
		// cidade contra o total do arquivo — se já bateu, pula o arquivo
		// inteiro numa reexecução de `npm run seed`.
		const residentEmails = residents.map((r) => r.email);
		const residentUsers = await prisma.user.findMany({
			where: { email: { in: residentEmails } },
			select: { id: true },
		});
		const residentUserIds = residentUsers.map((u) => u.id);
		const existingCount =
			residentUserIds.length > 0
				? await prisma.complaint.count({
						where: { user_id: { in: residentUserIds } },
					})
				: 0;

		if (existingCount >= file.complaints.length) {
			process.stdout.write(
				`  ${file.slug}: já seedado (${existingCount} denúncias existentes) ↷\n`,
			);
			processed += file.complaints.length;
			counters.skippedExisting += file.complaints.length;
			continue;
		}

		for (const data of file.complaints) {
			processed++;
			process.stdout.write(`  [${processed}/${totalComplaints}] ${file.slug}`);

			if (dryRun) {
				process.stdout.write(" ✓ (dry run)\n");
				counters.created++;
				continue;
			}

			try {
				await prisma.$transaction(async (tx) => {
					const authorResident = residents[data.author_resident_index];
					const { userId: authorUserId } = await upsertCityResident(
						tx,
						authorResident,
						passwordHash,
					);

					const wasteCategoryIds = data.waste_category_names
						.map((name) => categoryByName.get(name))
						.filter((id): id is string => id !== undefined);

					const complaint = await tx.complaint.create({
						data: {
							user_id: authorUserId,
							status: data.status,
							date: new Date(data.date),
							observations: data.observations,
							geospatial: data.geospatial as Prisma.InputJsonValue,
							waste_categories: {
								create: wasteCategoryIds.map((waste_category_id) => ({
									waste_category_id,
								})),
							},
						},
					});

					const { latitude, longitude } = data.geospatial.location.coords;
					await tx.$executeRaw`
						UPDATE "complaints"
						SET "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
						WHERE "id" = ${complaint.id}
					`;

					for (const att of data.attachments) {
						const assetPath = resolve(ASSETS_DIR, att.asset_file);
						if (!existsSync(assetPath)) {
							console.warn(
								`    ⚠ asset "${att.asset_file}" não encontrado em ${ASSETS_DIR} — anexo ignorado`,
							);
							continue;
						}

						const fileContent = readFileSync(assetPath);
						const storagePath = `complaints/${complaint.id}/${Date.now()}-${att.asset_file}`;
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
								complaint_id: complaint.id,
								url,
								file_name: att.asset_file,
								path: storagePath,
								base64: fileContent.toString("base64"),
								type: att.type,
							},
						});
					}

					for (const vote of data.votes) {
						const voterResident = residents[vote.resident_index];
						const { userId: voterUserId } = await upsertCityResident(
							tx,
							voterResident,
							passwordHash,
						);
						await tx.complaintVote.create({
							data: {
								complaint_id: complaint.id,
								user_id: voterUserId,
								vote_type: vote.vote_type,
							},
						});
					}

					// PREFER_COMPANY só vira company_id de verdade se o morador
					// resolvedor for, de fato, dono de alguma empresa no banco
					// NESTE momento — nunca um morador "emprestando" o company_id
					// de outro dono.
					for (const res of data.resolutions) {
						const resolverResident = residents[res.resident_index];
						const { userId: resolverUserId } = await upsertCityResident(
							tx,
							resolverResident,
							passwordHash,
						);

						let companyId: string | null = null;
						if (res.resolution_hint === "PREFER_COMPANY") {
							const owned = await tx.company.findFirst({
								where: { user_id: resolverUserId },
								select: { id: true },
							});
							companyId = owned?.id ?? null;
						}

						await tx.complaintResolution.create({
							data: {
								complaint_id: complaint.id,
								resolver_user_id: resolverUserId,
								description: res.description,
								company_id: companyId,
							},
						});
					}
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
	console.log(`  Já existiam (arquivo já seedado): ${counters.skippedExisting}`);
	console.log(`  Sem pool de moradores: ${counters.skippedNoResidents}`);
	console.log(`  Falharam (erro no banco): ${counters.failed}`);
	console.log(`  Total processado: ${totalComplaints}`);
	console.log("\nSeed de denúncias concluído.");
}
