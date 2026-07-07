import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_LOGS_DIR = resolve("cli/logs");

export type RunLogStatus = "start" | "done" | "error";

/**
 * Persiste em disco o progresso passo-a-passo de uma execução do CLI — a UI
 * do Listr2 é só o terminal (efêmera); isso existe pra permitir rastrear uma
 * trava/erro depois que a tela já rolou ou o terminal foi fechado.
 */
export class RunLogger {
	readonly filePath: string;

	constructor(logsDir: string = DEFAULT_LOGS_DIR) {
		mkdirSync(logsDir, { recursive: true });
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		this.filePath = resolve(logsDir, `run-${timestamp}.log`);
	}

	step(
		city: string,
		title: string,
		status: RunLogStatus,
		detail?: string,
	): void {
		this.write(`${city} — ${title}: ${status}${detail ? ` (${detail})` : ""}`);
	}

	error(scope: string, err: unknown): void {
		const message =
			err instanceof Error ? (err.stack ?? err.message) : String(err);
		this.write(`${scope} — ERRO: ${message}`);
	}

	private write(line: string): void {
		appendFileSync(
			this.filePath,
			`[${new Date().toISOString()}] ${line}\n`,
			"utf-8",
		);
	}
}
