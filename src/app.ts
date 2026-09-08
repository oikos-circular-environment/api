import fastifyBasicAuth from "@fastify/basic-auth";
import fastifyCookie from "@fastify/cookie";
import { fastifyCors } from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { fastifySwagger } from "@fastify/swagger";
import { trace } from "@opentelemetry/api";
import ScalarApiReference from "@scalar/fastify-api-reference";
import { fromNodeHeaders } from "better-auth/node";
import Fastify, { type FastifyBaseLogger, type FastifyRequest } from "fastify";
import {
	jsonSchemaTransform,
	jsonSchemaTransformObject,
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env, getCorsAllowedOrigins } from "@/env/index.js";
import { serverLogger } from "@/lib/logger.js";
import { createOpenApiDocumentMerger } from "@/lib/openapi-document.js";
import { accountRoutes } from "./modules/accounts/account-routes.js";
import { auth } from "./modules/auth/providers/auth/better-auth/better-auth.js";
import { createVerifyClientKey } from "./modules/common/middlewares/verify-client-key.js";
import { companyRoutes } from "./modules/companies/company-routes.js";
import { complaintRoutes } from "./modules/complaints/complaint-routes.js";
import { marketRoutes } from "./modules/market/market-routes.js";
import { moderationRoutes } from "./modules/moderation/moderation-routes.js";
import { profileRoutes } from "./modules/profiles/profile-routes.js";
import { storageRoutes } from "./modules/storage/storage-routes.js";
import { wasteCategoriesRoutes } from "./modules/wastes/waste-categories-routes.js";

const CLIENT_KEY_EXEMPT_PREFIXES = [
	"/health",
	"/docs",
	"/bullboard",
	"/storage",
];

function isExemptFromClientKey(url: string): boolean {
	return CLIENT_KEY_EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export const app = Fastify({
	loggerInstance: serverLogger as unknown as FastifyBaseLogger,
	disableRequestLogging: true,
	routerOptions: {
		maxParamLength: 5000,
	},
}).withTypeProvider<ZodTypeProvider>();

const corsAllowedOrigins = getCorsAllowedOrigins();

app.register(fastifyCors, {
	origin: corsAllowedOrigins.length > 0 ? corsAllowedOrigins : "*",
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
	openapi: {
		info: {
			title: "Oikos Documentation",
			version: "1.0.0",
			contact: {
				name: "Christian Cesar",
				email: "christian.cesar@oikos.company",
			},
		},
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
				clientKeyAuth: {
					type: "apiKey",
					in: "header",
					name: "X-Client-Key",
				},
			},
		},
		security: [{ clientKeyAuth: [] }],
	},
	transform: jsonSchemaTransform,
	transformObject: jsonSchemaTransformObject,
});

app.register(fastifyCookie);

app.register(fastifyMultipart, {
	limits: {
		files: 1,
		fileSize: 50 * 1024 * 1024,
	},
});

const verifyClientKey = createVerifyClientKey({
	enforce: env.CLIENT_KEY_ENFORCE,
	clients: [
		{ name: "mobile", key: env.CLIENT_KEY_MOBILE ?? "" },
		{ name: "web", key: env.CLIENT_KEY_WEB ?? "" },
	],
});

app.addHook("onRequest", async (request) => {
	if (isExemptFromClientKey(request.url)) {
		return;
	}
	await verifyClientKey(request);
});

app.register(fastifyRateLimit, {
	max: 100,
	timeWindow: "1 minute",
	cache: 10000,
	allowList: ["/docs"],
	skipOnError: false,
	keyGenerator: (request: FastifyRequest) => {
		return request.ip;
	},
});

app.register(fastifyBasicAuth, {
	validate(username, password, _req, _reply, done) {
		if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
			done();
		} else {
			done(new Error("Unauthorized"));
		}
	},
	authenticate: { realm: "oikos-admin" },
});

app.after(() => {
	app.addHook("onRequest", (request, reply, done) => {
		if (
			request.url.startsWith("/docs") ||
			request.url.startsWith("/bullboard")
		) {
			app.basicAuth(request, reply, done);
		} else {
			done();
		}
	});

	app.addHook("onRequest", (request, _reply, done) => {
		const span = trace.getActiveSpan();
		if (span?.isRecording()) {
			const { traceId, spanId } = span.spanContext();
			request.log = request.log.child({ traceId, spanId });
		}
		done();
	});

	app.addHook("onResponse", (request, reply, done) => {
		request.log.info({
			method: request.method,
			url: request.url,
			statusCode: reply.statusCode,
			responseTime: Math.round(reply.elapsedTime),
			requestId: request.id,
		});
		done();
	});
});

const {
	build: buildMergedOpenApiDocument,
	getDocument: getMergedOpenApiDocument,
} = createOpenApiDocumentMerger(app, auth);

export { buildMergedOpenApiDocument };

app.register(ScalarApiReference, {
	routePrefix: "/docs",
	configuration: {
		content: () => getMergedOpenApiDocument(),
		favicon: "https://avatars.githubusercontent.com/u/276378809?s=96&v=4",
		theme: "fastify",
		persistAuth: true,
		authentication: {
			preferredSecurityScheme: "bearerAuth",
			securitySchemes: {
				bearerAuth: {
					token: "",
				},
				clientKeyAuth: {
					value: "",
				},
			},
		},
		metaData: {
			title: "Oikos Documentation",
			description: "Boosting the circular economy",
		},
		servers: [
			{
				url: "https://api.oikos.company",
				description: "Production server",
			},
			{
				url: `http://localhost:${env.PORT}`,
				description: "Local development server",
				variables: {
					port: {
						default: env.PORT,
					},
				},
			},
		],
	},
});

app.get("/health", () => ({ status: "ok" }));

app.route({
	method: ["GET", "POST"],
	url: "/auth/*",
	async handler(request, reply) {
		const url = new URL(
			request.url,
			`${request.protocol}://${request.hostname}`,
		);
		const headers = fromNodeHeaders(request.headers);
		const req = new Request(url.toString(), {
			method: request.method,
			headers,
			...(request.body ? { body: JSON.stringify(request.body) } : {}),
		});
		const response = await auth.handler(req);
		reply.status(response.status);
		response.headers.forEach((value, key) => {
			reply.header(key, value);
		});
		return reply.send(response.body ? await response.text() : null);
	},
});

app.register(accountRoutes, { prefix: "/v1" });
app.register(profileRoutes, { prefix: "/v1" });
app.register(companyRoutes, { prefix: "/v1" });
app.register(complaintRoutes, { prefix: "/v1" });
app.register(marketRoutes, { prefix: "/v1" });
app.register(moderationRoutes);
app.register(wasteCategoriesRoutes, { prefix: "/v1" });

if (env.STORAGE_PROVIDER === "minio") {
	app.register(storageRoutes);
}

if (process.env.REDIS_URL) {
	const { createBullBoard } = await import("@bull-board/api");
	const { BullMQAdapter } = await import("@bull-board/api/bullMQAdapter");
	const { FastifyAdapter } = await import("@bull-board/fastify");
	const { complaintsQuorumQueue, accountDeletionQueue } = await import(
		"@/lib/queue/queues.js"
	);

	const serverAdapter = new FastifyAdapter();
	createBullBoard({
		queues: [
			new BullMQAdapter(complaintsQuorumQueue),
			new BullMQAdapter(accountDeletionQueue),
		],
		serverAdapter,
	});

	serverAdapter.setBasePath("/bullboard");
	app.register(serverAdapter.registerPlugin(), { prefix: "/bullboard" });
}
