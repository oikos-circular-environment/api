import z from "zod";

export const hazardLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]);
export type HazardLevel = z.infer<typeof hazardLevelSchema>;

export const subcategoryTypeSchema = z.enum(["INCLUDE", "EXCLUDE"]);
export type SubcategoryType = z.infer<typeof subcategoryTypeSchema>;

export const wasteSubcategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	observations: z.string().nullable(),
	hazard_level: hazardLevelSchema,
	type: subcategoryTypeSchema,
	created_at: z.date(),
	category_id: z.string(),
});
export type WasteSubcategory = z.infer<typeof wasteSubcategorySchema>;

export const wasteCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	observations: z.string().nullable(),
	hazard_levels: z.array(hazardLevelSchema),
	created_at: z.date(),
	updated_at: z.date(),
	subcategories: z.array(wasteSubcategorySchema),
});
export type WasteCategory = z.infer<typeof wasteCategorySchema>;
// Named OpenAPI component so it shows up in Scalar's Models tab, like Better Auth's entities.
z.globalRegistry.add(wasteCategorySchema, { id: "WasteCategory" });
