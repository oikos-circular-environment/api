/**
 * Reenvia pro MinIO real de producao os anexos de denuncia cujo `url`
 * aponta pro host de dev local (bug do seed:prod antes do tunel MinIO ser
 * adicionado em seed-prod.ts - ver o comentario la em cima). O `path`
 * (chave S3) e o `base64` (conteudo do arquivo) ja ficam gravados em
 * complaint_attachments desde a criacao, entao nao precisa dos arquivos
 * originais em cli/assets pra corrigir - so reenviar o mesmo conteudo pra
 * chave certa no bucket de producao e trocar o host da `url`.
 *
 * Variaveis de ambiente esperadas (mesmas do seed:prod):
 *   DEST_SSH_HOST - IP publico da A1.Flex
 *   DEST_SSH_KEY  - caminho da chave privada do usuario deploy
 *
 * Uso:
 *   DEST_SSH_HOST=164.152.241.127 DEST_SSH_KEY=~/.ssh/oikos-deploy \
 *     npx tsx scripts/fix-prod-complaint-attachments.ts
 */

import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { connect } from "node:net";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const DEST_COMPOSE_DIR = "/opt/oikos/docker";
const REMOTE_POSTGRES_CONTAINER = "oikos-prod-postgresql-1";
const REMOTE_MINIO_CONTAINER = "oikos-prod-minio-1";
const LOCAL_PORT = Number(process.env.LOCAL_PORT ?? 55432);
const LOCAL_MINIO_PORT = Number(process.env.LOCAL_MINIO_PORT ?? 55900);
const PROD_PUBLIC_URL = "https://api.oikos.company";
const BUCKET = "oikos";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		console.error(
			`ERRO: variavel de ambiente obrigatoria nao definida: ${name}`,
		);
		process.exit(1);
	}
	return value;
}

const sshHost = requireEnv("DEST_SSH_HOST");
const sshKey = requireEnv("DEST_SSH_KEY");

function sshExec(command: string): string {
	return execFileSync("ssh", ["-i", sshKey, `deploy@${sshHost}`, command], {
		encoding: "utf-8",
	}).trim();
}

function readEnvVar(envFile: string, name: string): string {
	const match = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
	if (!match) throw new Error(`Variavel ${name} nao encontrada em .env.infra`);
	return match[1];
}

function waitForPort(port: number, timeoutMs = 5000): Promise<void> {
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const attempt = () => {
			const socket = connect(port, "127.0.0.1");
			socket.once("connect", () => {
				socket.end();
				resolve();
			});
			socket.once("error", () => {
				socket.destroy();
				if (Date.now() - start > timeoutMs) {
					reject(new Error(`Tunel SSH nao ficou pronto em ${timeoutMs}ms`));
					return;
				}
				setTimeout(attempt, 200);
			});
		};
		attempt();
	});
}

async function main() {
	console.log("==> Descobrindo IPs internos dos containers postgresql/minio");
	const postgresIp = sshExec(
		`docker inspect ${REMOTE_POSTGRES_CONTAINER} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`,
	);
	if (!postgresIp)
		throw new Error("Nao consegui obter o IP do container postgresql");
	const minioIp = sshExec(
		`docker inspect ${REMOTE_MINIO_CONTAINER} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`,
	);
	if (!minioIp) throw new Error("Nao consegui obter o IP do container minio");

	console.log("==> Lendo credenciais do .env.infra na VM");
	const envInfra = sshExec(`cat ${DEST_COMPOSE_DIR}/.env.infra`);
	const postgresUser = readEnvVar(envInfra, "POSTGRES_USER");
	const postgresPassword = readEnvVar(envInfra, "POSTGRES_PASSWORD");
	const postgresDb = readEnvVar(envInfra, "POSTGRES_DB");
	const minioAccessKey = readEnvVar(envInfra, "MINIO_ACCESS_KEY");
	const minioSecretKey = readEnvVar(envInfra, "MINIO_SECRET_KEY");

	console.log(
		`==> Abrindo tuneis SSH locais (postgres ${LOCAL_PORT} -> ${postgresIp}:5432, minio ${LOCAL_MINIO_PORT} -> ${minioIp}:9000)`,
	);
	const tunnel: ChildProcess = spawn(
		"ssh",
		[
			"-i",
			sshKey,
			"-N",
			"-L",
			`${LOCAL_PORT}:${postgresIp}:5432`,
			"-L",
			`${LOCAL_MINIO_PORT}:${minioIp}:9000`,
			`deploy@${sshHost}`,
		],
		{ stdio: "ignore" },
	);
	tunnel.on("error", (err) => {
		console.error("Erro no tunel SSH:", err);
		process.exit(1);
	});

	try {
		await waitForPort(LOCAL_PORT);
		await waitForPort(LOCAL_MINIO_PORT);

		const databaseUrl = `postgresql://${postgresUser}:${postgresPassword}@localhost:${LOCAL_PORT}/${postgresDb}`;
		const adapter = new PrismaPg({ connectionString: databaseUrl });
		const prisma = new PrismaClient({ adapter });

		const s3 = new S3Client({
			endpoint: `http://localhost:${LOCAL_MINIO_PORT}`,
			region: "us-east-1",
			credentials: {
				accessKeyId: minioAccessKey,
				secretAccessKey: minioSecretKey,
			},
			forcePathStyle: true,
		});

		const broken = await prisma.complaintAttachment.findMany({
			where: { url: { not: { startsWith: `${PROD_PUBLIC_URL}/storage/` } } },
			select: { id: true, path: true, base64: true, url: true },
		});

		console.log(`==> ${broken.length} anexo(s) com URL quebrada encontrados`);

		let fixed = 0;
		let failed = 0;
		for (const att of broken) {
			try {
				const buffer = Buffer.from(att.base64, "base64");
				await s3.send(
					new PutObjectCommand({
						Bucket: BUCKET,
						Key: att.path,
						Body: buffer,
					}),
				);
				const newUrl = `${PROD_PUBLIC_URL}/storage/${att.path}`;
				await prisma.complaintAttachment.update({
					where: { id: att.id },
					data: { url: newUrl },
				});
				fixed++;
				console.log(`  ✓ ${att.path}`);
			} catch (err) {
				failed++;
				console.log(`  ✗ ${att.path}: ${(err as Error).message}`);
			}
		}

		console.log(`\nCorrigidos: ${fixed}, Falharam: ${failed}`);
		await prisma.$disconnect();

		if (failed > 0) process.exitCode = 1;
	} finally {
		tunnel.kill();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
