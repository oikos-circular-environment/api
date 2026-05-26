import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import {
	getMarketQuerySchema,
	marketCompanySchema,
} from "./dtos/market-dto.js";
import { MarketRepositoryPrisma } from "./repositories/prisma/market-repository-prisma.js";
import { ListMarketUseCase } from "./use-cases/list-market-use-case.js";

export async function marketRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	typedApp.get(
		"/market",
		{
			schema: {
				tags: ["Market"],
				summary: "List market companies",
				description:
					"Returns companies near the given coordinates, sorted by distance.",
				querystring: getMarketQuerySchema,
				response: {
					200: z.object({
						companies: z.array(marketCompanySchema),
						next_cursor: z.string().nullable(),
					}),
				},
			},
		},
		async (request, reply) => {
			const { lat, lon, radius, q, category, cursor, limit } = request.query;

			const repo = new MarketRepositoryPrisma();
			const sut = new ListMarketUseCase(repo);

			const { companies, next_cursor } = await sut.execute({
				lat,
				lon,
				radius,
				q,
				category,
				cursor,
				limit,
			});

			return reply.send({ companies, next_cursor });
		},
	);
}
