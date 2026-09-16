import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
	Prisma,
	PrismaClient,
} from "../../src/generated/prisma/client.js";
import { makeStorageProvider } from "../../src/modules/common/providers/storage/make-storage-provider.js";
import type {
	ModerationSeverity,
	ModerationStatus,
} from "../../src/modules/denunciation/dtos/denunciations-dto.js";
import { upsertSeedUsers } from "./shared/upsert-seed-users.js";

const DEFAULT_TARGET = 20;
const MOCK_IMAGES_DIR = resolve("src/assets/mock-images");

const DENUNCIATION_TITLES = [
	"Usuário me assediou em mensagem privada",
	"Perfil falso usando minha foto e nome",
	"Vendedor de resíduos aplicando golpe no chat",
	"Spam em massa nas denúncias da minha região",
	"Comentário com conteúdo discriminatório",
	"Usuário oferecendo serviço proibido na plataforma",
	"Ponto de coleta divulgando preço diferente do combinado",
	"Usuário publicando dados pessoais de terceiros",
];

const DENUNCIATION_DESCRIPTIONS = [
	"Recebi mensagens com teor ofensivo e ameaçador. Guardei os prints das conversas como evidência.",
	"Alguém criou um perfil usando minha foto de perfil e meu nome completo, se passando por mim.",
	"Após o pagamento, o vendedor desapareceu e não entregou o material combinado. Tenho o registro da conversa.",
	"Uma mesma denúncia foi publicada dezenas de vezes em poucas horas por contas recém-criadas.",
	"Em uma denúncia pública o usuário usou termos racistas. A publicação precisa ser removida imediatamente.",
	"O usuário está anunciando a venda de resíduos proibidos, o que é vetado pelos termos de uso.",
	"O ponto de coleta anunciou o valor de R$ 3/kg e na entrega cobrou R$ 8/kg, se recusando a emitir recibo.",
	"O usuário divulgou telefone e endereço de outra pessoa numa resposta pública, sem autorização.",
];

const DENUNCIATION_REASONS = [
	"Conta suspensa por 7 dias após análise das evidências enviadas.",
	"Conteúdo removido e usuário recebeu advertência formal.",
	"Sem indícios suficientes — denúncia arquivada após análise da moderação.",
	"Usuário banido permanentemente por reincidência de conduta abusiva.",
	"Conta suspensa por 30 dias e conteúdo reportado removido.",
	"Notificação enviada ao usuário. Sem necessidade de suspensão.",
	"Denúncia duplicada de caso já em análise — arquivada.",
	"Encaminhado ao suporte para investigação aprofundada. Denúncia encerrada.",
];

const STATUSES: ModerationStatus[] = [
	"OPEN",
	"CLOSED",
	"CANCELLED",
	"RESOLVED",
];
const SEVERITIES: ModerationSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function pickRandom<T>(items: readonly T[]): T {
	return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateInRange(start: Date, end: Date): Date {
	const startMs = start.getTime();
	return new Date(startMs + Math.random() * (end.getTime() - startMs));
}

function pickWeighted<T>(items: readonly T[], weights: readonly number[]): T {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let roll = Math.random() * total;
	for (let i = 0; i < items.length; i++) {
		roll -= weights[i];
		if (roll <= 0) return items[i];
	}
	return items[items.length - 1];
}

function randomBrazilianCoords(): { latitude: number; longitude: number } {
	return {
		latitude: Math.round((Math.random() * 21 - 29) * 1e6) / 1e6,
		longitude: Math.round((Math.random() * 18 - 56) * 1e6) / 1e6,
	};
}

/** Cria 20 denúncias com dados aleatórios (status, severidade, anexos com
 * `metadata` e `type` usando os prints de `src/assets/mock-images`, e a "ação
 * tomada" registrada nos campos de moderação para denúncias finalizadas). Todas
 * as denúncias são reportadas por `christian@oikos.company` contra os usuários
 * demo. */
export async function seedDenunciation(prisma: PrismaClient) {
	const dryRun = process.env.SEED_DRY_RUN === "true";
	const target = DEFAULT_TARGET;

	const existingCount = await prisma.denunciation.count();
	if (existingCount >= target) {
		console.log(
			`denunciação: ${existingCount} já existem — pulando (limit=${target}) ↷`,
		);
		return;
	}

	const imageFiles = existsSync(MOCK_IMAGES_DIR)
		? readdirSync(MOCK_IMAGES_DIR).filter((f) => f.endsWith(".jpg"))
		: [];
	if (imageFiles.length === 0) {
		console.warn(
			`denunciação: nenhum mock de imagem encontrado em ${MOCK_IMAGES_DIR} — denúncias serão criadas sem anexos`,
		);
	}

	const seedUsers = dryRun ? null : await upsertSeedUsers(prisma);
	const { ownerId, ownerEmail, moderatorId, reportedUserIds } = seedUsers ?? {
		ownerId: "",
		ownerEmail: "",
		moderatorId: "",
		reportedUserIds: [],
	};
	const storageProvider = makeStorageProvider();

	const counters = { created: 0, failed: 0 };

	console.log(`denunciação: criando ${target} denúncias...`);

	for (let i = 0; i < target; i++) {
		try {
			if (dryRun) {
				counters.created++;
				continue;
			}

			const createdAt = randomDateInRange(
				new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
				new Date(Date.now() - 60 * 60 * 1000),
			);
			const status = pickWeighted(STATUSES, [40, 20, 15, 25]);
			const severity = status === "OPEN" ? null : pickRandom(SEVERITIES);
			const hasLocation = Math.random() < 0.7;
			const { latitude, longitude } = hasLocation
				? randomBrazilianCoords()
				: { latitude: null, longitude: null };

			await prisma.$transaction(async (tx) => {
				const created = await tx.denunciation.create({
					data: {
						title: pickRandom(DENUNCIATION_TITLES),
						description: pickRandom(DENUNCIATION_DESCRIPTIONS),
						status,
						severity,
						reporter_user_id: ownerId,
						reporter_email: ownerEmail,
						reported_user_id:
							reportedUserIds[randomInt(0, reportedUserIds.length - 1)],
						latitude,
						longitude,
						created_at: createdAt,
						moderated_by: status === "OPEN" ? null : moderatorId,
						moderated_at:
							status === "OPEN"
								? null
								: randomDateInRange(createdAt, new Date()),
						reason: status === "OPEN" ? null : pickRandom(DENUNCIATION_REASONS),
					},
				});

				const attachmentCount = randomInt(0, 3);
				const pickedImages = [...imageFiles]
					.sort(() => Math.random() - 0.5)
					.slice(0, attachmentCount);

				for (const file of pickedImages) {
					const assetPath = resolve(MOCK_IMAGES_DIR, file);
					if (!existsSync(assetPath)) continue;

					const fileContent = readFileSync(assetPath);
					const storagePath = `denunciations/${created.id}/${Date.now()}-${file}`;
					const uploaded = await storageProvider.uploadFile(
						storagePath,
						fileContent,
					);
					if (!uploaded) {
						console.warn(`  ⚠ upload de "${file}" falhou — anexo ignorado`);
						continue;
					}

					const { url } = await storageProvider.getFileUrl(storagePath);
					await tx.denunciationAttachment.create({
						data: {
							denunciation_id: created.id,
							url,
							file_name: file,
							path: storagePath,
							type: "PHOTO",
							metadata: {
								size: fileContent.byteLength,
								mime: "image/jpeg",
							} as Prisma.InputJsonValue,
						},
					});
				}
			});

			counters.created++;
			process.stdout.write(
				`  [${i + 1}/${target}] ${status}${severity ? ` (${severity})` : ""} ✓\n`,
			);
		} catch (err) {
			process.stdout.write(
				`  [${i + 1}/${target}] ✗ (${(err as Error).message})\n`,
			);
			counters.failed++;
		}
	}

	console.log(`\n${dryRun ? "[DRY RUN] " : ""}Resumo de denunciação:`);
	console.log(`  Criadas: ${counters.created}`);
	console.log(`  Falharam (erro no banco): ${counters.failed}`);
}
