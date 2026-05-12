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
} from "@/modules/companies/dtos/companies-dto.js";
import { PrismaAddressesRepository } from "@/modules/companies/repositories/prisma/addresses-repository-prisma.js";
import { PrismaBusinessHoursRepository } from "@/modules/companies/repositories/prisma/business-hours-repository-prisma.js";
import { PrismaCompaniesRepository } from "@/modules/companies/repositories/prisma/companies-repository-prisma.js";
import { PrismaServicesRepository } from "@/modules/companies/repositories/prisma/services-repository-prisma.js";
import { PrismaWastesRepository } from "@/modules/companies/repositories/prisma/wastes-repository-prisma.js";
import { CreateCompanyAddressUseCase } from "@/modules/companies/use-cases/company-addresses/create-company-address-use-case.js";
import { GetCompanyAddressUseCase } from "@/modules/companies/use-cases/company-addresses/get-company-address-use-case.js";
import { UpdateCompanyAddressUseCase } from "@/modules/companies/use-cases/company-addresses/update-company-address-use-case.js";
import { GetCompanyBusinessHoursUseCase } from "@/modules/companies/use-cases/company-business-hours/get-company-business-hours-use-case.js";
import { UpsertCompanyBusinessHoursUseCase } from "@/modules/companies/use-cases/company-business-hours/upsert-company-business-hours-use-case.js";
import { GetCompanyServicesUseCase } from "@/modules/companies/use-cases/company-services/get-company-services-use-case.js";
import { UpsertCompanyServicesUseCase } from "@/modules/companies/use-cases/company-services/upsert-company-services-use-case.js";
import { GetCompanyWastesUseCase } from "@/modules/companies/use-cases/company-wastes/get-company-wastes-use-case.js";
import { UpsertCompanyWastesUseCase } from "@/modules/companies/use-cases/company-wastes/upsert-company-wastes-use-case.js";
import { CreateCompanyUseCase } from "@/modules/companies/use-cases/create-company-use-case.js";
import { GetCompanyUseCase } from "@/modules/companies/use-cases/get-company-use-case.js";
import { UpdateCompanyUseCase } from "@/modules/companies/use-cases/update-company-use-case.js";
import { protectedProcedure, router } from "../trpc.js";

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
const upsertCompanyBusinessHoursUseCase = new UpsertCompanyBusinessHoursUseCase(
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

export const companiesTrpcRouter = router({
	create: protectedProcedure
		.input(createCompanySchema.omit({ user_id: true }))
		.output(companySchema)
		.mutation(async ({ ctx, input }) => {
			return createCompanyUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),

	get: protectedProcedure
		.output(companySchema.nullable())
		.query(async ({ ctx }) => {
			return getCompanyUseCase.execute({ userId: ctx.userId });
		}),

	update: protectedProcedure
		.input(updateCompanySchema)
		.output(companySchema.nullable())
		.mutation(async ({ ctx, input }) => {
			return updateCompanyUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),

	businessHours: router({
		get: protectedProcedure
			.output(companyBusinessHoursSchema)
			.query(async ({ ctx }) => {
				return getCompanyBusinessHoursUseCase.execute({ userId: ctx.userId });
			}),

		/** Equivalente a POST e PUT `/companies/business-hours` no REST. */
		upsert: protectedProcedure
			.input(upsertCompanyBusinessHoursSchema)
			.output(companyBusinessHoursSchema)
			.mutation(async ({ ctx, input }) => {
				return upsertCompanyBusinessHoursUseCase.execute({
					userId: ctx.userId,
					data: input.business_hours,
				});
			}),
	}),

	wastes: router({
		get: protectedProcedure
			.output(companyWastesSchema)
			.query(async ({ ctx }) => {
				return getCompanyWastesUseCase.execute({ userId: ctx.userId });
			}),

		/** Equivalente a POST e PUT `/companies/wastes` no REST. */
		upsert: protectedProcedure
			.input(upsertCompanyWastesSchema)
			.output(companyWastesSchema)
			.mutation(async ({ ctx, input }) => {
				return upsertCompanyWastesUseCase.execute({
					userId: ctx.userId,
					data: input.wastes,
				});
			}),
	}),

	services: router({
		get: protectedProcedure
			.output(companyServicesSchema)
			.query(async ({ ctx }) => {
				return getCompanyServicesUseCase.execute({ userId: ctx.userId });
			}),

		/** Equivalente a POST e PUT `/companies/services` no REST. */
		upsert: protectedProcedure
			.input(upsertCompanyServicesSchema)
			.output(companyServicesSchema)
			.mutation(async ({ ctx, input }) => {
				return upsertCompanyServicesUseCase.execute({
					userId: ctx.userId,
					data: input.services,
				});
			}),
	}),

	addresses: router({
		create: protectedProcedure
			.input(createCompanyAddressSchema.omit({ company_id: true }))
			.output(companyAddressSchema)
			.mutation(async ({ ctx, input }) => {
				return createCompanyAddressUseCase.execute({
					userId: ctx.userId,
					data: input,
				});
			}),

		get: protectedProcedure
			.output(companyAddressSchema.nullable())
			.query(async ({ ctx }) => {
				return getCompanyAddressUseCase.execute({ userId: ctx.userId });
			}),

		update: protectedProcedure
			.input(updateCompanyAddressSchema)
			.output(companyAddressSchema.nullable())
			.mutation(async ({ ctx, input }) => {
				return updateCompanyAddressUseCase.execute({
					userId: ctx.userId,
					data: input,
				});
			}),
	}),
});
