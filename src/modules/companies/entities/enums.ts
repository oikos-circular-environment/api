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
