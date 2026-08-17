/**
 * Roda os seeds (prisma/seeds) contra o Postgres de producao, via tunel SSH
 * pro IP interno do container - ver docs/infrastructure.md (repo devops)
 * secao "Conectando um gerenciador de banco". Uso esperado: manutencao
 * pontual ou povoamento inicial de infra nova - nao faz parte do fluxo
 * normal de dev (que roda `npm run seed` contra o Postgres local).
 *
 * Sem guarda especial pra seedUsers de proposito - os usuarios fake fazem
 * parte do povoamento de dados do MVP.
 *
 * Variaveis de ambiente esperadas (sem default, forca conferir antes de rodar):
 *   DEST_SSH_HOST - IP publico da A1.Flex
 *   DEST_SSH_KEY  - caminho da chave privada do usuario deploy
 *
 * Uso:
 *   DEST_SSH_HOST=134.65.229.35 DEST_SSH_KEY=~/.ssh/oikos-deploy npm run seed:prod
 */

import {
	type ChildProcess,
	execFileSync,
	spawn,
	spawnSync,
} from "node:child_process";
import { connect } from "node:net";

const DEST_COMPOSE_DIR = "/opt/oikos/docker";
const REMOTE_CONTAINER = "oikos-prod-postgresql-1";
const LOCAL_PORT = Number(process.env.LOCAL_PORT ?? 55432);

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
	if (!match) throw new Error(`Variavel ${name} nao encontrada em .env.prod`);
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
	console.log("==> Descobrindo IP interno do container postgresql");
	const containerIp = sshExec(
		`docker inspect ${REMOTE_CONTAINER} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'`,
	);
	if (!containerIp)
		throw new Error("Nao consegui obter o IP do container postgresql");

	console.log("==> Lendo credenciais do .env.infra na VM");
	const envInfra = sshExec(`cat ${DEST_COMPOSE_DIR}/.env.infra`);
	const postgresUser = readEnvVar(envInfra, "POSTGRES_USER");
	const postgresPassword = readEnvVar(envInfra, "POSTGRES_PASSWORD");
	const postgresDb = readEnvVar(envInfra, "POSTGRES_DB");

	console.log(
		`==> Abrindo tunel SSH local (porta ${LOCAL_PORT} -> ${containerIp}:5432)`,
	);
	const tunnel: ChildProcess = spawn(
		"ssh",
		[
			"-i",
			sshKey,
			"-N",
			"-L",
			`${LOCAL_PORT}:${containerIp}:5432`,
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

		const databaseUrl = `postgresql://${postgresUser}:${postgresPassword}@localhost:${LOCAL_PORT}/${postgresDb}`;
		console.log(`==> Rodando seed contra producao (banco: ${postgresDb})`);
		const result = spawnSync("npm", ["run", "seed"], {
			stdio: "inherit",
			env: { ...process.env, DATABASE_URL: databaseUrl },
		});
		if (result.status !== 0) {
			throw new Error(`Seed terminou com codigo ${result.status}`);
		}
	} finally {
		tunnel.kill();
	}

	console.log("==> Seed concluido.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
