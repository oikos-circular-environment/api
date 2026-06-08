import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { makeStorageProvider } from "../common/providers/storage/make-storage-provider.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	companyAddressSchema,
	companyBusinessHoursSchema,
	companyProfileSchema,
	companySchema,
	companyServicesSchema,
	companyValidationSchema,
	companyWastesSchema,
	createCompanyInputSchema,
	updateCompanyInputSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
	upsertCompanyServicesSchema,
	upsertCompanyWastesSchema,
} from "./dtos/companies-dto.js";

import { PrismaAddressesRepository } from "./repositories/prisma/addresses-repository-prisma.js";
import { PrismaBusinessHoursRepository } from "./repositories/prisma/business-hours-repository-prisma.js";
import { PrismaCompaniesRepository } from "./repositories/prisma/companies-repository-prisma.js";
import { PrismaCompanyValidationRepository } from "./repositories/prisma/company-validation-repository-prisma.js";
import { PrismaServicesRepository } from "./repositories/prisma/services-repository-prisma.js";
import { PrismaWastesRepository } from "./repositories/prisma/wastes-repository-prisma.js";
import { GetCompanyAddressUseCase } from "./use-cases/company-addresses/get-company-address-use-case.js";
import { UpsertCompanyAddressUseCase } from "./use-cases/company-addresses/upsert-company-address-use-case.js";
import { GetCompanyBusinessHoursUseCase } from "./use-cases/company-business-hours/get-company-business-hours-use-case.js";
import { UpsertCompanyBusinessHoursUseCase } from "./use-cases/company-business-hours/upsert-company-business-hours-use-case.js";
import { GetCompanyServicesUseCase } from "./use-cases/company-services/get-company-services-use-case.js";
import { UpsertCompanyServicesUseCase } from "./use-cases/company-services/upsert-company-services-use-case.js";
import { GetCompanyValidationUseCase } from "./use-cases/company-validations/get-company-validation-use-case.js";
import { GetCompanyWastesUseCase } from "./use-cases/company-wastes/get-company-wastes-use-case.js";
import { UpsertCompanyWastesUseCase } from "./use-cases/company-wastes/upsert-company-wastes-use-case.js";
import { CreateCompanyUseCase } from "./use-cases/create-company-use-case.js";
import { GetCompanyUseCase } from "./use-cases/get-company-use-case.js";
import { ToggleCompanyStatusUseCase } from "./use-cases/toggle-company-status-use-case.js";
import { UpdateCompanyUseCase } from "./use-cases/update-company-use-case.js";
import { UploadCompanyAvatarUseCase } from "./use-cases/upload-company-avatar-use-case.js";

const COMPANIES_TAG = "Companies";
const COMPANIES_ADDRESSES_TAG = "Companies / Addresses";
const COMPANIES_BUSINESS_HOURS_TAG = "Companies / Business Hours";
const COMPANIES_WASTES_TAG = "Companies / Wastes";
const COMPANIES_SERVICES_TAG = "Companies / Services";
const COMPANIES_VALIDATIONS_TAG = "Companies / Validations";

export async function companyRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const companiesRepository = new PrismaCompaniesRepository();
	const addressesRepository = new PrismaAddressesRepository();
	const businessHoursRepository = new PrismaBusinessHoursRepository();
	const wastesRepository = new PrismaWastesRepository();
	const servicesRepository = new PrismaServicesRepository();
	const validationRepository = new PrismaCompanyValidationRepository();
	const storageProvider = makeStorageProvider();

	const createCompanyUseCase = new CreateCompanyUseCase(
		companiesRepository,
		validationRepository,
	);
	const getCompanyUseCase = new GetCompanyUseCase(
		companiesRepository,
		addressesRepository,
		businessHoursRepository,
		wastesRepository,
		servicesRepository,
	);
	const updateCompanyUseCase = new UpdateCompanyUseCase(
		companiesRepository,
		validationRepository,
	);
	const toggleCompanyStatusUseCase = new ToggleCompanyStatusUseCase(
		companiesRepository,
	);
	const uploadCompanyAvatarUseCase = new UploadCompanyAvatarUseCase(
		companiesRepository,
		storageProvider,
	);
	const upsertCompanyAddressUseCase = new UpsertCompanyAddressUseCase(
		companiesRepository,
		addressesRepository,
		validationRepository,
	);
	const getCompanyAddressUseCase = new GetCompanyAddressUseCase(
		companiesRepository,
		addressesRepository,
	);
	const upsertCompanyBusinessHoursUseCase =
		new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);
	const getCompanyBusinessHoursUseCase = new GetCompanyBusinessHoursUseCase(
		companiesRepository,
		businessHoursRepository,
	);
	const upsertCompanyWastesUseCase = new UpsertCompanyWastesUseCase(
		companiesRepository,
		wastesRepository,
		validationRepository,
	);
	const getCompanyWastesUseCase = new GetCompanyWastesUseCase(
		companiesRepository,
		wastesRepository,
	);
	const upsertCompanyServicesUseCase = new UpsertCompanyServicesUseCase(
		companiesRepository,
		servicesRepository,
		validationRepository,
	);
	const getCompanyServicesUseCase = new GetCompanyServicesUseCase(
		companiesRepository,
		servicesRepository,
	);
	const getCompanyValidationUseCase = new GetCompanyValidationUseCase(
		companiesRepository,
		validationRepository,
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
				body: createCompanyInputSchema.omit({ user_id: true }),
				response: {
					200: z.object({ company: companySchema }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const company = await createCompanyUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send({ company });
		},
	);

	typedApp.get(
		"/companies",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_TAG],
				summary: "Get user companies",
				description:
					"Returns all companies of the authenticated user with address, business hours, wastes and services.",
				response: {
					200: z.object({ companies: z.array(companyProfileSchema) }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const companies = await getCompanyUseCase.execute({ userId });

			return reply.send({ companies });
		},
	);

	typedApp.put(
		"/companies/:id",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_TAG],
				summary: "Update user company",
				description:
					"Updates only company data for the authenticated user. Related entities are not handled by this route.",
				params: z.object({ id: z.uuid() }),
				body: updateCompanyInputSchema,
				response: {
					200: z.object({ company: companySchema.nullable() }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const company = await updateCompanyUseCase.execute({
				userId,
				companyId,
				data: request.body,
			});

			return reply.send({ company });
		},
	);

	typedApp.patch(
		"/companies/:id/status",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_TAG],
				summary: "Toggle company status",
				description:
					"Activates or deactivates a company for the authenticated user.",
				params: z.object({ id: z.uuid() }),
				body: z.object({ status: z.boolean() }),
				response: {
					200: z.object({ company: companySchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const { status } = request.body;

			const company = await toggleCompanyStatusUseCase.execute({
				userId,
				companyId,
				status,
			});

			return reply.send({ company });
		},
	);

	typedApp.post(
		"/companies/:id/avatar",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_TAG],
				summary: "Upload company avatar",
				description: "Uploads an avatar image for a company.",
				params: z.object({ id: z.uuid() }),
				consumes: ["multipart/form-data"],
				response: {
					200: z.object({ company: companySchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					500: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const data = await request.file();

			if (!data) {
				return reply.status(400).send({
					message: "No file provided",
					code: "NO_FILE",
					statusCode: 400,
				});
			}

			const content = await data.toBuffer();

			const company = await uploadCompanyAvatarUseCase.execute({
				userId,
				companyId,
				file: {
					fileName: data.filename,
					mimeType: data.mimetype,
					content,
				},
			});

			return reply.send({ company });
		},
	);

	typedApp.get(
		"/companies/:id/business-hours",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_BUSINESS_HOURS_TAG],
				summary: "Get company business hours",
				description:
					"Returns business hours from Sunday to Saturday for the specified company.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ business_hours: companyBusinessHoursSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const business_hours = await getCompanyBusinessHoursUseCase.execute({
				userId,
				companyId,
			});

			return reply.send({ business_hours });
		},
	);

	typedApp.put(
		"/companies/:id/business-hours",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_BUSINESS_HOURS_TAG],
				summary: "Upsert company business hours",
				description:
					"Creates or updates business hours for the specified company.",
				params: z.object({ id: z.uuid() }),
				body: upsertCompanyBusinessHoursSchema,
				response: {
					200: z.object({ business_hours: companyBusinessHoursSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const business_hours = await upsertCompanyBusinessHoursUseCase.execute({
				userId,
				companyId,
				data: request.body.business_hours,
			});

			return reply.send({ business_hours });
		},
	);

	typedApp.put(
		"/companies/:id/wastes",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_WASTES_TAG],
				summary: "Upsert company wastes",
				description:
					"Creates or replaces the wastes linked to the specified company.",
				params: z.object({ id: z.uuid() }),
				body: upsertCompanyWastesSchema,
				response: {
					200: z.object({ wastes: companyWastesSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const wastes = await upsertCompanyWastesUseCase.execute({
				userId,
				companyId,
				data: request.body.wastes,
			});

			return reply.send({ wastes });
		},
	);

	typedApp.get(
		"/companies/:id/wastes",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_WASTES_TAG],
				summary: "Get company wastes",
				description: "Returns all wastes linked to the specified company.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ wastes: companyWastesSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const wastes = await getCompanyWastesUseCase.execute({
				userId,
				companyId,
			});

			return reply.send({ wastes });
		},
	);

	typedApp.put(
		"/companies/:id/services",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_SERVICES_TAG],
				summary: "Upsert company services",
				description:
					"Creates or replaces the services linked to the specified company.",
				params: z.object({ id: z.uuid() }),
				body: upsertCompanyServicesSchema,
				response: {
					200: z.object({ services: companyServicesSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					400: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const services = await upsertCompanyServicesUseCase.execute({
				userId,
				companyId,
				data: request.body.services,
			});

			return reply.send({ services });
		},
	);

	typedApp.get(
		"/companies/:id/services",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_SERVICES_TAG],
				summary: "Get company services",
				description: "Returns all services linked to the specified company.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ services: companyServicesSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const services = await getCompanyServicesUseCase.execute({
				userId,
				companyId,
			});

			return reply.send({ services });
		},
	);

	typedApp.get(
		"/companies/:id/addresses",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_ADDRESSES_TAG],
				summary: "Get company address",
				description: "Returns the address of the specified company.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ address: companyAddressSchema.nullable() }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const address = await getCompanyAddressUseCase.execute({
				userId,
				companyId,
			});

			return reply.send({ address });
		},
	);

	typedApp.get(
		"/companies/:id/validations",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_VALIDATIONS_TAG],
				summary: "Get company validations",
				description:
					"Returns the validation status for each section of the specified company.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ validation: companyValidationSchema.nullable() }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const validation = await getCompanyValidationUseCase.execute({
				userId,
				companyId,
			});

			return reply.send({ validation });
		},
	);

	typedApp.put(
		"/companies/:id/addresses",
		{
			schema: withBearerAuth({
				tags: [COMPANIES_ADDRESSES_TAG],
				summary: "Upsert company address",
				description:
					"Creates or updates the address for the specified company.",
				params: z.object({ id: z.uuid() }),
				body: upsertCompanyAddressSchema,
				response: {
					200: z.object({ address: companyAddressSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { id: companyId } = request.params;
			const address = await upsertCompanyAddressUseCase.execute({
				userId,
				companyId,
				data: request.body,
			});

			return reply.send({ address });
		},
	);
}
