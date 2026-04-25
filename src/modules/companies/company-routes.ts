import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	companyAddressSchema,
	companyBusinessHoursSchema,
	companySchema,
	companyServicesSchema,
	companyWastesSchema,
	createCompanyAddressSchema,
	createCompanySchema,
	updateCompanyAddressSchema,
	updateCompanySchema,
	upsertCompanyBusinessHoursSchema,
	upsertCompanyServicesSchema,
	upsertCompanyWastesSchema,
} from "./dtos/companies-dto.js";
import { PrismaAddressesRepository } from "./repositories/prisma/addresses-repository-prisma.js";
import { PrismaBusinessHoursRepository } from "./repositories/prisma/business-hours-repository-prisma.js";
import { PrismaCompaniesRepository } from "./repositories/prisma/companies-repository-prisma.js";
import { PrismaServicesRepository } from "./repositories/prisma/services-repository-prisma.js";
import { PrismaWastesRepository } from "./repositories/prisma/wastes-repository-prisma.js";
import { CreateCompanyAddressUseCase } from "./use-cases/company-addresses/create-company-address-use-case.js";
import { GetCompanyAddressUseCase } from "./use-cases/company-addresses/get-company-address-use-case.js";
import { UpdateCompanyAddressUseCase } from "./use-cases/company-addresses/update-company-address-use-case.js";
import { GetCompanyBusinessHoursUseCase } from "./use-cases/company-business-hours/get-company-business-hours-use-case.js";
import { UpsertCompanyBusinessHoursUseCase } from "./use-cases/company-business-hours/upsert-company-business-hours-use-case.js";
import { GetCompanyServicesUseCase } from "./use-cases/company-services/get-company-services-use-case.js";
import { UpsertCompanyServicesUseCase } from "./use-cases/company-services/upsert-company-services-use-case.js";
import { GetCompanyWastesUseCase } from "./use-cases/company-wastes/get-company-wastes-use-case.js";
import { UpsertCompanyWastesUseCase } from "./use-cases/company-wastes/upsert-company-wastes-use-case.js";
import { CreateCompanyUseCase } from "./use-cases/create-company-use-case.js";
import { GetCompanyUseCase } from "./use-cases/get-company-use-case.js";
import { UpdateCompanyUseCase } from "./use-cases/update-company-use-case.js";

const COMPANIES_TAG = "Companies";
const COMPANIES_ADDRESSES_TAG = "Companies / Addresses";
const COMPANIES_BUSINESS_HOURS_TAG = "Companies / Business Hours";
const COMPANIES_WASTES_TAG = "Companies / Wastes";
const COMPANIES_SERVICES_TAG = "Companies / Services";

export async function companyRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const companiesRepository = new PrismaCompaniesRepository();
	const addressesRepository = new PrismaAddressesRepository();
	const businessHoursRepository = new PrismaBusinessHoursRepository();
	const wastesRepository = new PrismaWastesRepository();
	const servicesRepository = new PrismaServicesRepository();

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
	const upsertCompanyWastesUseCase = new UpsertCompanyWastesUseCase(
		companiesRepository,
		wastesRepository,
	);
	const getCompanyWastesUseCase = new GetCompanyWastesUseCase(
		companiesRepository,
		wastesRepository,
	);
	const upsertCompanyServicesUseCase = new UpsertCompanyServicesUseCase(
		companiesRepository,
		servicesRepository,
	);
	const getCompanyServicesUseCase = new GetCompanyServicesUseCase(
		companiesRepository,
		servicesRepository,
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

	typedApp.post(
		"/companies/wastes",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_WASTES_TAG],
				summary: "Create company wastes",
				description:
					"Creates or replaces the wastes linked to the authenticated user's company.",
				body: upsertCompanyWastesSchema,
				response: {
					200: companyWastesSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const wastes = await upsertCompanyWastesUseCase.execute({
				userId,
				data: request.body.wastes,
			});

			return reply.send(wastes);
		},
	);

	typedApp.put(
		"/companies/wastes",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_WASTES_TAG],
				summary: "Update company wastes",
				description:
					"Replaces the wastes linked to the authenticated user's company.",
				body: upsertCompanyWastesSchema,
				response: {
					200: companyWastesSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const wastes = await upsertCompanyWastesUseCase.execute({
				userId,
				data: request.body.wastes,
			});

			return reply.send(wastes);
		},
	);

	typedApp.get(
		"/companies/wastes",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_WASTES_TAG],
				summary: "Get company wastes",
				description:
					"Returns all wastes linked to the authenticated user's company.",
				response: {
					200: companyWastesSchema,
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const wastes = await getCompanyWastesUseCase.execute({ userId });

			return reply.send(wastes);
		},
	);

	typedApp.post(
		"/companies/services",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_SERVICES_TAG],
				summary: "Create company services",
				description:
					"Creates or replaces the services linked to the authenticated user's company.",
				body: upsertCompanyServicesSchema,
				response: {
					200: companyServicesSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const services = await upsertCompanyServicesUseCase.execute({
				userId,
				data: request.body.services,
			});

			return reply.send(services);
		},
	);

	typedApp.put(
		"/companies/services",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_SERVICES_TAG],
				summary: "Update company services",
				description:
					"Replaces the services linked to the authenticated user's company.",
				body: upsertCompanyServicesSchema,
				response: {
					200: companyServicesSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const services = await upsertCompanyServicesUseCase.execute({
				userId,
				data: request.body.services,
			});

			return reply.send(services);
		},
	);

	typedApp.get(
		"/companies/services",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_SERVICES_TAG],
				summary: "Get company services",
				description:
					"Returns all services linked to the authenticated user's company.",
				response: {
					200: companyServicesSchema,
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const services = await getCompanyServicesUseCase.execute({ userId });

			return reply.send(services);
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
