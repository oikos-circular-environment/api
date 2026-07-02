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
const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;

// Logs saem só por dois canais: console (pino-pretty, só em dev) e OTLP (só quando
// OTEL_EXPORTER_OTLP_ENDPOINT está definido — mesmo guard do otel.ts). Sem fallback em
// arquivo — em produção o Alloy sempre está no ar, então o endpoint sempre existe ali.
function otlpTarget(loggerName: string, level: string): pino.TransportTargetOptions {
	return {
		target: "pino-opentelemetry-transport",
		level,
		options: {
			loggerName,
			serviceVersion: process.env.npm_package_version ?? "1.0.0",
			resourceAttributes: {
				"service.name": "oikos-api",
				"deployment.environment.name": env.NODE_ENV,
			},
			logRecordProcessorOptions: {
				recordProcessorType: "batch",
				exporterOptions: {
					protocol: "http/protobuf",
					protobufExporterOptions: { url: `${otlpEndpoint}/v1/logs` },
				},
			},
		},
	};
}

const prettyTarget: pino.TransportTargetOptions = {
	target: "pino-pretty",
	options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
	level: env.LOG_LEVEL,
};

const serverTargets: pino.TransportTargetOptions[] = [
	...(isDev ? [prettyTarget] : []),
	...(otlpEndpoint ? [otlpTarget("oikos-api", env.LOG_LEVEL)] : []),
];

export const serverLogger: pino.Logger = isTest
	? pino({ level: "silent" })
	: serverTargets.length > 0
		? pino({ level: env.LOG_LEVEL, mixin: otelMixin }, pino.transport({ targets: serverTargets }))
		: pino({ level: env.LOG_LEVEL, mixin: otelMixin }); // stdout puro — só se nem dev nem OTLP estiverem ativos

const queryTargets: pino.TransportTargetOptions[] = otlpEndpoint
	? [otlpTarget("oikos-api-queries", "info")]
	: [];

export const queryLogger: pino.Logger = isTest
	? pino({ level: "silent" })
	: queryTargets.length > 0
		? pino({ level: "info", base: null, mixin: otelMixin }, pino.transport({ targets: queryTargets }))
		: pino({ level: "silent" }); // sem OTLP configurado, sem console — mesmo comportamento de antes (nunca ia pro console)
