import z from "zod";

export const identityTypeSchema = z.enum(["CPF", "CNPJ"]);
export type IdentityType = z.infer<typeof identityTypeSchema>;

export const companyTypeSchema = z.enum([
	"ONG",
	"COMPANY",
	"GOVERNMENT",
	"COLLECTOR",
]);
export type CompanyType = z.infer<typeof companyTypeSchema>;

export const dayOfWeekSchema = z.enum([
	"SUNDAY",
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const measurementSchema = z.enum([
	"DAY",
	"KG",
	"L",
	"UNIT",
	"M",
	"M2",
	"M3",
	"ML",
]);
export type Measurement = z.infer<typeof measurementSchema>;
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(companyTypeSchema, { id: "CompaniesCompanyType" });
z.globalRegistry.add(dayOfWeekSchema, { id: "CompaniesDayOfWeek" });
z.globalRegistry.add(identityTypeSchema, { id: "CompaniesIdentityType" });
z.globalRegistry.add(measurementSchema, { id: "CompaniesMeasurement" });
