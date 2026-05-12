import {
	type FastifyTRPCPluginOptions,
	fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import type { FastifyInstance } from "fastify";
import type { AppRouter } from "./app-router.js";
import { appRouter } from "./app-router.js";
import { createContext } from "./context.js";

export function registerTrpcPlugin(app: FastifyInstance): void {
	app.register(fastifyTRPCPlugin, {
		prefix: "/trpc",
		trpcOptions: {
			router: appRouter,
			createContext,
			onError({ path, error }) {
				app.log.error({ path, err: error }, "tRPC handler error");
			},
		} satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
	});
}
