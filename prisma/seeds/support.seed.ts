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
} from "../../src/modules/support/dtos/support-dto.js";
import { upsertSeedUsers } from "./shared/upsert-seed-users.js";

const DEFAULT_TARGET = 20;
const MOCK_IMAGES_DIR = resolve("src/assets/mock-images");

type SupportType = "ERROR" | "SUPPORT" | "IMPROVEMENT";

const SUPPORT_TITLES: Record<SupportType, string[]> = {
	ERROR: [
		"App fecha ao abrir a tela de reciclagem",
		"Erro ao tentar anexar foto na denúncia",
		"Login falha com erro de servidor",
		"Mapa de pontos de coleta não carrega",
		"Notificação de status não chega no celular",
		"Erro 500 ao salvar perfil da empresa",
	],
	SUPPORT: [
		"Como cadastrar minha empresa de reciclagem?",
		"Dúvida sobre o status da minha denúncia",
		"Preciso de ajuda para recuperar acesso à conta",
		"Como funciona a pontuação de resíduos?",
		"Quero excluir uma denúncia que fiz por engano",
		"Não consigo ver meus pontos de coleta favoritos",
	],
	IMPROVEMENT: [
		"Sugestão: filtro por tipo de resíduo no mapa",
		"Melhorar notificações de status de denúncia",
		"Adicionar suporte a tema escuro",
		"Permitir denúncia anônima sem cadastro",
		"Incluir histórico de ações dos meus resíduos",
		"Notificar quando um ponto de coleta tiver horário alterado",
	],
};

const SUPPORT_DESCRIPTIONS: Record<SupportType, string[]> = {
	ERROR: [
		"O aplicativo encerra imediatamente ao tocar no card de resíduos na tela inicial. Já tentei reinstalar e o problema persiste.",
		"Ao selecionar uma foto da galeria, o app mostra 'Falha ao enviar anexo' e a denúncia não é enviada. Acontece com qualquer imagem.",
		"Após digitar e-mail e senha, aparece uma mensagem de erro de servidor e o login não progride. Testei também no modo web.",
		"A tela de mapa fica em branco com um indicador de carregamento infinito. O problema começou após a última atualização.",
		"Não recebo nenhum push de mudança de status das denúncias. As permissões de notificação estão habilitadas.",
		"Ao salvar as informações da empresa, o formulário retorna erro 500 sem mensagem. Já confirmei todos os campos obrigatórios.",
	],
	SUPPORT: [
		"Gostaria de um passo a passo para cadastrar minha cooperativa como ponto de coleta de eletrônicos e óleo de cozinha.",
		"Criei uma denúncia há dois dias e segue como aberta. Quando posso esperar uma atualização?",
		"Perdi o acesso ao e-mail cadastrado e não consigo redefinir a senha do aplicativo.",
		"A função é nova para mim. Pode explicar como os pontos de resíduo são contabilizados no meu perfil?",
		"Fiz uma denúncia com uma foto errada por engano. Existe alguma forma de removê-la?",
		"Marquei alguns pontos como favoritos e hoje não aparecem mais na minha lista.",
	],
	IMPROVEMENT: [
		"Seria útil poder filtrar o mapa por categoria de resíduo (plástico, eletrônico, orgânico) antes de navegar.",
		"As notificações de status poderiam incluir o motivo da alteração, para eu não precisar reabrir a denúncia.",
		"O aplicativo é claro e usaria o modo escuro com frequência, principalmente à noite.",
		"Permitir reportar problemas ambientais sem criar conta aumentaria a participação da comunidade.",
		"Um histórico das ações dos meus resíduos (quando colei, quando foram coletados) ajudaria a acompanhar meu progresso.",
		"Avisar quando um ponto de coleta mudar o horário evitaria viagens perdidas.",
	],
};

const SUPPORT_REASONS = [
	"Orientamos o usuário a atualizar o aplicativo para a versão mais recente e a tentar novamente. Em caso de persistência, reabriremos o chamado.",
	"Solicitação resolvida: o problema foi corrigido na versão 2.4.1 e o usuário foi notificado por e-mail.",
	"Solicitação duplicada de um chamado já em andamento. Encerrada sem novas ações.",
	"Recurso já disponível na versão 2.4.0. Chamado encerrado após orientação enviada por e-mail.",
	"Acesso restabelecido após verificação de identidade. Chamado encerrado.",
	"Erro reproduzido e encaminhado ao time de engenharia. Chamado encerrado com acompanhamento programado.",
	"A solicitação de melhoria foi registrada no roadmap. Chamado encerrado.",
	"Não foi possível reproduzir o erro relatado. Orientamos o usuário a enviar mais detalhes caso volte a ocorrer. Chamado encerrado.",
];

const PLATFORMS = ["ios", "android", "web"] as const;
const SCREEN_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
const STATUSES: ModerationStatus[] = [
	"OPEN",
	"CLOSED",
	"CANCELLED",
	"RESOLVED",
];
const SEVERITIES: ModerationSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const APP_VERSIONS = ["2.3.0", "2.3.5", "2.4.0", "2.4.1"];
const OS_VERSIONS = ["iOS 17.4", "Android 14", "Android 13", "iOS 17.2"];
const LAST_ERRORS = {
	message: "TypeError: Cannot read properties of undefined (reading 'id')",
	stack: "at ComplaintCard (component.tsx:84:17)",
	component_stack: "ComplaintCard > ListItem > Pressable",
};

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

function pickStatus(): ModerationStatus {
	return pickWeighted(STATUSES, [40, 20, 15, 25]);
}

function buildEnvironment(type: SupportType): Prisma.InputJsonValue {
	const environment: {
		platform: string;
		app_version: string;
		os_version: string;
		screen_size: string;
		last_error?: {
			message: string;
			stack: string;
			component_stack: string;
			occurred_at: string;
		};
	} = {
		platform: pickRandom(PLATFORMS),
		app_version: pickRandom(APP_VERSIONS),
		os_version: pickRandom(OS_VERSIONS),
		screen_size: pickRandom(SCREEN_SIZES),
	};
	if (type === "ERROR") {
		environment.last_error = {
			...LAST_ERRORS,
			occurred_at: new Date().toISOString(),
		};
	}
	return environment as Prisma.InputJsonValue;
}

/** Cria 20 chamados de support com dados aleatórios (status, severidade,
 * anexos usando os prints de `src/assets/mock-images`, e a "ação tomada"
 * registrada nos campos de moderação para chamados finalizados). Todos os
 * chamados ficam vinculados ao usuário `christian@oikos.company`. */
export async function seedSupport(prisma: PrismaClient) {
	const dryRun = process.env.SEED_DRY_RUN === "true";
	const target = DEFAULT_TARGET;

	const existingCount = await prisma.support.count();
	if (existingCount >= target) {
		console.log(
			`support: ${existingCount} já existem — pulando (limit=${target}) ↷`,
		);
		return;
	}

	const imageFiles = existsSync(MOCK_IMAGES_DIR)
		? readdirSync(MOCK_IMAGES_DIR).filter((f) => f.endsWith(".jpg"))
		: [];
	if (imageFiles.length === 0) {
		console.warn(
			`support: nenhum mock de imagem encontrado em ${MOCK_IMAGES_DIR} — chamados serão criados sem anexos`,
		);
	}

	const seedUsers = dryRun ? null : await upsertSeedUsers(prisma);
	const { ownerId, ownerEmail, moderatorId } = seedUsers ?? {
		ownerId: "",
		ownerEmail: "",
		moderatorId: "",
	};
	const storageProvider = makeStorageProvider();

	const counters = { created: 0, failed: 0 };

	console.log(`support: criando até ${target} chamados...`);

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
			const status = pickStatus();
			const type = pickWeighted(
				["ERROR", "SUPPORT", "IMPROVEMENT"] as const,
				[35, 45, 20],
			);
			const severity = status === "OPEN" ? null : pickRandom(SEVERITIES);

			await prisma.$transaction(async (tx) => {
				const created = await tx.support.create({
					data: {
						title: pickRandom(SUPPORT_TITLES[type]),
						description: pickRandom(SUPPORT_DESCRIPTIONS[type]),
						type,
						status,
						severity,
						environment: buildEnvironment(type),
						user_id: ownerId,
						reporter_email: ownerEmail,
						created_at: createdAt,
						moderated_by: status === "OPEN" ? null : moderatorId,
						moderated_at:
							status === "OPEN"
								? null
								: randomDateInRange(createdAt, new Date()),
						reason: status === "OPEN" ? null : pickRandom(SUPPORT_REASONS),
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
					const storagePath = `supports/${created.id}/${Date.now()}-${file}`;
					const uploaded = await storageProvider.uploadFile(
						storagePath,
						fileContent,
					);
					if (!uploaded) {
						console.warn(`  ⚠ upload de "${file}" falhou — anexo ignorado`);
						continue;
					}

					const { url } = await storageProvider.getFileUrl(storagePath);
					await tx.supportAttachment.create({
						data: {
							support_id: created.id,
							url,
							file_name: file,
							path: storagePath,
						},
					});
				}
			});

			counters.created++;
			process.stdout.write(
				`  [${i + 1}/${target}] ${type} ${status}${severity ? ` (${severity})` : ""} ✓\n`,
			);
		} catch (err) {
			process.stdout.write(
				`  [${i + 1}/${target}] ✗ (${(err as Error).message})\n`,
			);
			counters.failed++;
		}
	}

	console.log(`\n${dryRun ? "[DRY RUN] " : ""}Resumo de support:`);
	console.log(`  Criados: ${counters.created}`);
	console.log(`  Falharam (erro no banco): ${counters.failed}`);
}
