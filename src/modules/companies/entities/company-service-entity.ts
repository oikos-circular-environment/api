import z from "zod";
import { wasteCategorySchema } from "@/modules/wastes/entities/waste-entity.js";
import { measurementSchema } from "./enums.js";

export const companyServiceSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional().nullable(),
	price: z.number().nonnegative("Price must be non-negative"),
	unit: measurementSchema,
	waste_category_id: z.uuid("waste_category_id must be a valid UUID"),
	waste_category: wasteCategorySchema,
	quantity: z.number().positive("Quantity must be greater than zero"),
	created_at: z.date(),
	updated_at: z.date(),
});
export type CompanyService = z.infer<typeof companyServiceSchema>;

export const companyServicesSchema = z.array(companyServiceSchema);
