import z from "zod";
import { companyAddressSchema } from "@/modules/companies/entities/address-entity.js";
import { businessHourTimeSlotSchema } from "@/modules/companies/entities/business-hour-entity.js";
import { companyWasteSchema } from "@/modules/companies/entities/company-waste-entity.js";
import {
	companyTypeSchema,
	dayOfWeekSchema,
	identityTypeSchema,
} from "@/modules/companies/entities/enums.js";
import { wasteCategorySchema } from "@/modules/wastes/entities/waste-entity.js";

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

const marketAddressSchema = companyAddressSchema
	.omit({
		city_ibge_id: true,
		state_ibge_id: true,
		created_at: true,
		updated_at: true,
	})
	.extend({
		complement: z.string().nullable(),
	});
export type MarketAddress = z.infer<typeof marketAddressSchema>;

const marketWasteCategorySchema = wasteCategorySchema.pick({
	id: true,
	name: true,
	hazard_levels: true,
});

const marketItemSchema = companyWasteSchema
	.pick({
		id: true,
		name: true,
		price: true,
		unit: true,
		waste_category_id: true,
		quantity: true,
	})
	.extend({
		description: z.string().nullable(),
		waste_category: marketWasteCategorySchema,
	});
export type MarketItem = z.infer<typeof marketItemSchema>;

const marketBusinessHourSchema = z.object({
	id: z.string(),
	day_of_week: dayOfWeekSchema,
	is_open: z.boolean(),
	time_slots: z.array(businessHourTimeSlotSchema),
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
	avatar: z.string().nullable(),
	services: z.array(marketItemSchema),
	wastes: z.array(marketItemSchema),
	business_hours: z.array(marketBusinessHourSchema),
	distance_in_meters: z.number(),
});

export const marketCompanyRecordSchema = marketCompanyBaseSchema.extend({
	identity: z.string(),
	identity_type: identityTypeSchema,
});
export type MarketCompanyRecord = z.infer<typeof marketCompanyRecordSchema>;

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
