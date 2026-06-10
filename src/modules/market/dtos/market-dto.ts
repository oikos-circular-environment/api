import z from "zod";

import {
	companyTypeSchema,
	dayOfWeekSchema,
	identityTypeSchema,
	measurementSchema,
} from "@/modules/companies/dtos/companies-dto.js";
import { hazardLevelSchema } from "@/modules/wastes/dtos/wastes-dto.js";

export const getMarketQuerySchema = z.object({
	lat: z.coerce.number(),
	lon: z.coerce.number(),
	radius: z.coerce.number().optional().default(1000),
	q: z.string().optional(),
	category: z.enum(["services", "waste"]).optional(),
	cursor: z.string().optional(),
	limit: z.coerce.number().optional().default(20),
});

export type GetMarketQuery = z.infer<typeof getMarketQuerySchema>;

const marketAddressSchema = z.object({
	id: z.string(),
	zip_code: z.string(),
	street: z.string(),
	number: z.string(),
	complement: z.string().nullable(),
	district: z.string(),
	city: z.string(),
	state: z.string(),
	state_code: z.string(),
	latitude: z.number(),
	longitude: z.number(),
});

export type MarketAddress = z.infer<typeof marketAddressSchema>;

const marketWasteCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	hazard_levels: z.array(hazardLevelSchema),
});

const marketItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	price: z.number(),
	unit: measurementSchema,
	waste_category_id: z.string(),
	waste_category: marketWasteCategorySchema,
	quantity: z.number(),
	observations: z.string().nullable(),
});

export type MarketItem = z.infer<typeof marketItemSchema>;

const marketBusinessHourTimeSlotSchema = z.object({
	id: z.string(),
	start_time: z.string(),
	end_time: z.string(),
});

export type MarketBusinessHourTimeSlot = z.infer<
	typeof marketBusinessHourTimeSlotSchema
>;

const marketBusinessHourSchema = z.object({
	id: z.string(),
	day_of_week: dayOfWeekSchema,
	is_open: z.boolean(),
	time_slots: z.array(marketBusinessHourTimeSlotSchema),
});

export type MarketBusinessHour = z.infer<typeof marketBusinessHourSchema>;

const marketCompanyBaseSchema = z.object({
	id: z.string(),
	business_name: z.string(),
	corporate_name: z.string(),
	company_type: companyTypeSchema,
	status: z.boolean(),
	phones: z.array(z.string()),
	address: marketAddressSchema,
	services: z.array(marketItemSchema),
	wastes: z.array(marketItemSchema),
	business_hours: z.array(marketBusinessHourSchema),
	distance_in_meters: z.number(),
});

// Dado bruto vindo dos repositórios — identity sempre presente
export const marketCompanyRecordSchema = marketCompanyBaseSchema.extend({
	identity: z.string(),
	identity_type: identityTypeSchema,
});

export type MarketCompanyRecord = z.infer<typeof marketCompanyRecordSchema>;

// Resposta da API — identity exposto apenas para CNPJ (LGPD: CPF nunca é retornado)
export const marketCompanySchema = marketCompanyBaseSchema.extend({
	identity: z.string().nullable(),
	identity_type: z.literal("CNPJ").nullable(),
});

export type MarketCompany = z.infer<typeof marketCompanySchema>;

export const marketResponseSchema = z.object({
	companies: z.array(marketCompanySchema),
	next_cursor: z.string().nullable(),
});

export type MarketResponse = z.infer<typeof marketResponseSchema>;
