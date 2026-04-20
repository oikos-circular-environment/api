import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	companyAddressSchema,
	companyBusinessHoursSchema,
	companySchema,
	createCompanyAddressSchema,
	createCompanySchema,
	updateCompanyAddressSchema,
	updateCompanySchema,
	upsertCompanyBusinessHoursSchema,
} from "./dtos/companies-dto.js";
import { PrismaAddressesRepository } from "./repositories/prisma/addresses-repository-prisma.js";
import { PrismaBusinessHoursRepository } from "./repositories/prisma/business-hours-repository-prisma.js";
import { PrismaCompaniesRepository } from "./repositories/prisma/companies-repository-prisma.js";
import { CreateCompanyAddressUseCase } from "./use-cases/company-addresses/create-company-address-use-case.js";
import { GetCompanyAddressUseCase } from "./use-cases/company-addresses/get-company-address-use-case.js";
import { UpdateCompanyAddressUseCase } from "./use-cases/company-addresses/update-company-address-use-case.js";
import { GetCompanyBusinessHoursUseCase } from "./use-cases/company-business-hours/get-company-business-hours-use-case.js";
import { UpsertCompanyBusinessHoursUseCase } from "./use-cases/company-business-hours/upsert-company-business-hours-use-case.js";
import { CreateCompanyUseCase } from "./use-cases/create-company-use-case.js";
import { GetCompanyUseCase } from "./use-cases/get-company-use-case.js";
import { UpdateCompanyUseCase } from "./use-cases/update-company-use-case.js";

const COMPANIES_TAG = "Companies";
const COMPANIES_ADDRESSES_TAG = "Companies / Addresses";
const COMPANIES_BUSINESS_HOURS_TAG = "Companies / Business Hours";

export async function companiesRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const companiesRepository = new PrismaCompaniesRepository();
	const addressesRepository = new PrismaAddressesRepository();
	const businessHoursRepository = new PrismaBusinessHoursRepository();

	const createCompanyUseCase = new CreateCompanyUseCase(companiesRepository);
	const getCompanyUseCase = new GetCompanyUseCase(companiesRepository);
	const updateCompanyUseCase = new UpdateCompanyUseCase(companiesRepository);
	const createCompanyAddressUseCase = new CreateCompanyAddressUseCase(
		companiesRepository,
		addressesRepository,
	);
	const getCompanyAddressUseCase = new GetCompanyAddressUseCase(
		companiesRepository,
		addressesRepository,
	);
	const updateCompanyAddressUseCase = new UpdateCompanyAddressUseCase(
		companiesRepository,
		addressesRepository,
	);
	const upsertCompanyBusinessHoursUseCase =
		new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
		);
	const getCompanyBusinessHoursUseCase = new GetCompanyBusinessHoursUseCase(
		companiesRepository,
		businessHoursRepository,
	);

	typedApp.addHook("onRequest", async (request) => {
		await verifyJwt(request);
	});

	typedApp.post(
		"/companies",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_TAG],
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

	typedApp.post(
		"/companies/business-hours",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_BUSINESS_HOURS_TAG],
				summary: "Create company business hours",
				description:
					"Creates or updates business hours for the authenticated user's company.",
				body: upsertCompanyBusinessHoursSchema,
				response: {
					200: companyBusinessHoursSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const businessHours = await upsertCompanyBusinessHoursUseCase.execute({
				userId,
				data: request.body.business_hours,
			});

			return reply.send(businessHours);
		},
	);

	typedApp.get(
		"/companies/business-hours",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_BUSINESS_HOURS_TAG],
				summary: "Get company business hours",
				description:
					"Returns business hours from Sunday to Saturday for the authenticated user's company.",
				response: {
					200: companyBusinessHoursSchema,
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const businessHours = await getCompanyBusinessHoursUseCase.execute({
				userId,
			});

			return reply.send(businessHours);
		},
	);

	typedApp.put(
		"/companies/business-hours",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_BUSINESS_HOURS_TAG],
				summary: "Update company business hours",
				description:
					"Upserts business hours for the authenticated user's company allowing partial payload.",
				body: upsertCompanyBusinessHoursSchema,
				response: {
					200: companyBusinessHoursSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const businessHours = await upsertCompanyBusinessHoursUseCase.execute({
				userId,
				data: request.body.business_hours,
			});

			return reply.send(businessHours);
		},
	);

	typedApp.get(
		"/companies",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_TAG],
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
				tags: [COMPANIES_TAG],
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

	typedApp.post(
		"/companies/addresses",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_ADDRESSES_TAG],
				summary: "Create company address",
				description: "Creates an address for the authenticated user's company.",
				body: createCompanyAddressSchema.omit({ company_id: true }),
				response: {
					200: companyAddressSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const address = await createCompanyAddressUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(address);
		},
	);

	typedApp.get(
		"/companies/addresses",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_ADDRESSES_TAG],
				summary: "Get company address",
				description: "Returns the address of the authenticated user's company.",
				response: {
					200: companyAddressSchema.nullable(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const address = await getCompanyAddressUseCase.execute({ userId });

			return reply.send(address);
		},
	);

	typedApp.put(
		"/companies/addresses",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_ADDRESSES_TAG],
				summary: "Update company address",
				description:
					"Updates only address data for the authenticated user's company.",
				body: updateCompanyAddressSchema,
				response: {
					200: companyAddressSchema.nullable(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const updatedAddress = await updateCompanyAddressUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(updatedAddress);
		},
	);
}
