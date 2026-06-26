import { trace } from "@opentelemetry/api";
import pino from "pino";
import { env } from "@/env/index.js";

// Injeta traceId e spanId do span OTel ativo em cada log record.
// Quando OTel está desabilitado, getActiveSpan() retorna undefined — mixin retorna {}.
function otelMixin(): Record<string, string> {
	const span = trace.getActiveSpan();
	if (!span?.isRecording()) return {};
	const { traceId, spanId } = span.spanContext();
	return { traceId, spanId };
}

const isTest = env.NODE_ENV === "test";
const isDev = env.NODE_ENV === "dev";

export const serverLogger: pino.Logger = isTest
	? pino({ level: "silent" })
	: pino(
			{ level: env.LOG_LEVEL, mixin: otelMixin },
			pino.transport({
				targets: [
					...(isDev
						? [
								{
									target: "pino-pretty",
									options: {
										translateTime: "HH:MM:ss Z",
										ignore: "pid,hostname",
									},
									level: env.LOG_LEVEL,
								},
							]
						: []),
					{
						target: "pino-roll",
						options: {
							file: "logs/server.log",
							frequency: "daily", // rola diariamente
							size: "20m", // ou ao atingir 20 MB, o que vier primeiro
							limit: { count: 7 }, // mantém server.log + server.1.log … server.7.log
							mkdir: true,
						},
						level: env.LOG_LEVEL,
					},
				],
			}),
		);

export const queryLogger: pino.Logger = isTest
	? pino({ level: "silent" })
	: pino(
			{ level: "info", base: null, mixin: otelMixin },
			pino.transport({
				target: "pino-roll",
				options: {
					file: "logs/queries.log",
					frequency: "daily",
					size: "10m",
					limit: { count: 3 }, // queries crescem menos; 3 dias é suficiente
					mkdir: true,
				},
			}),
		);
