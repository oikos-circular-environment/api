import { FastifyOtelInstrumentation } from "@fastify/otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";

// Guard: se OTEL_EXPORTER_OTLP_ENDPOINT não estiver definido, o SDK nunca é criado.
// Em produção sem a variável, este arquivo é um no-op — zero overhead.
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
	const sdk = new NodeSDK({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: "oikos-api",
			[ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "1.0.0",
			"deployment.environment.name": process.env.NODE_ENV ?? "production",
		}),
		traceExporter: new OTLPTraceExporter({
			url: `${endpoint}/v1/traces`,
		}),
		metricReader: new PeriodicExportingMetricReader({
			exporter: new OTLPMetricExporter({
				url: `${endpoint}/v1/metrics`,
			}),
			exportIntervalMillis: 30_000,
		}),
		instrumentations: [
			getNodeAutoInstrumentations({
				// fs e dns geram spans demais sem valor diagnóstico
				"@opentelemetry/instrumentation-fs": { enabled: false },
				"@opentelemetry/instrumentation-dns": { enabled: false },
			}),
			new FastifyOtelInstrumentation({ registerOnInitialization: true }),
			new PrismaInstrumentation(),
			new RuntimeNodeInstrumentation({ monitoringPrecision: 5_000 }),
		],
	});

	sdk.start();

	const shutdown = () => sdk.shutdown().catch(console.error);
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}
