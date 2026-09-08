import z from "zod";
import { wasteCategorySchema } from "../entities/waste-entity.js";

export const wasteCategorySummarySchema = wasteCategorySchema.omit({
	subcategories: true,
});
export type WasteCategorySummary = z.infer<typeof wasteCategorySummarySchema>;

export type {
	HazardLevel,
	SubcategoryType,
	WasteCategory,
	WasteSubcategory,
} from "../entities/waste-entity.js";
export {
	hazardLevelSchema,
	subcategoryTypeSchema,
	wasteCategorySchema,
	wasteSubcategorySchema,
} from "../entities/waste-entity.js";

// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(wasteCategorySummarySchema, {
	id: "WastesWasteCategorySummary",
});
