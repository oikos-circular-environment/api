import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	companySchema,
	createCompanySchema,
	updateCompanySchema,
} from "./dtos/companies-dto.js";
import { PrismaCompaniesRepository } from "./repositories/prisma/companies-repository-prisma.js";
import { CreateCompanyUseCase } from "./use-cases/create-company-use-case.js";
import { GetCompanyUseCase } from "./use-cases/get-company-use-case.js";
import { UpdateCompanyUseCase } from "./use-cases/update-company-use-case.js";

export async function companiesRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const companiesRepository = new PrismaCompaniesRepository();

	const createCompanyUseCase = new CreateCompanyUseCase(companiesRepository);
	const getCompanyUseCase = new GetCompanyUseCase(companiesRepository);
	const updateCompanyUseCase = new UpdateCompanyUseCase(companiesRepository);

	typedApp.addHook("onRequest", async (request) => {
		await verifyJwt(request);
	});

	typedApp.post(
		"/companies",
		{
			schema: withBearerAuth({
				tags: ["Companies"],
				summary: "Create user company",
				description: "Creates a company for the authenticated user.",
				body: createCompanySchema.omit({ user_id: true }),
				response: {
					200: companySchema,
					401: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const company = await createCompanyUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(company);
		},
	);

	typedApp.get(
		"/companies",
		{
			schema: withBearerAuth({
				tags: ["Companies"],
				summary: "Get user company",
				description: "Returns the company of the authenticated user.",
				response: {
					200: companySchema.nullable(),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const company = await getCompanyUseCase.execute({ userId });

			return reply.send(company);
		},
	);

	typedApp.put(
		"/companies",
		{
			schema: withBearerAuth({
				tags: ["Companies"],
				summary: "Update user company",
				description:
					"Updates only company data for the authenticated user. Related entities are not handled by this route.",
				body: updateCompanySchema,
				response: {
					200: companySchema.nullable(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const updatedCompany = await updateCompanyUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(updatedCompany);
		},
	);
}
