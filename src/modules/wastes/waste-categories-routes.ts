import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { wasteCategorySchema } from "./dtos/wastes-dto.js";
import { PrismaWasteCategoriesRepository } from "./repositories/prisma/waste-categories-repository-prisma.js";
import { ListWasteCategoriesUseCase } from "./use-cases/list-waste-categories-use-case.js";

const WASTE_CATEGORIES_TAG = "Waste Categories";

export async function wasteCategoriesRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	const wasteCategoriesRepository = new PrismaWasteCategoriesRepository();
	const listWasteCategoriesUseCase = new ListWasteCategoriesUseCase(
		wasteCategoriesRepository,
	);

	typedApp.get(
		"/waste-categories",
		{
			schema: {
				tags: [WASTE_CATEGORIES_TAG],
				summary: "List waste categories",
				description:
					"Returns all waste categories with subcategories. Used to populate waste/service selection in company registration.",
				response: {
					200: z.object({ categories: z.array(wasteCategorySchema) }),
					500: appErrorSchema,
				},
			},
		},
		async (_request, reply) => {
			const categories = await listWasteCategoriesUseCase.execute();

			return reply.send({ categories });
		},
	);

	typedApp.get(
		"/waste-categories/:id",
		{
			schema: {
				tags: [WASTE_CATEGORIES_TAG],
				summary: "Get waste category by ID",
				description: "Returns a single waste category with all subcategories.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ category: wasteCategorySchema }),
					404: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params;
			const category = await wasteCategoriesRepository.findById(id);

			if (!category) {
				return reply.status(404).send({
					message: "Waste category not found",
					code: "WASTE_CATEGORY_NOT_FOUND",
					statusCode: 404,
				});
			}

			return reply.send({ category });
		},
	);
}
