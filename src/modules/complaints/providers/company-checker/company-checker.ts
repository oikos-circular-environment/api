export interface CompanyOwnershipChecker {
	userOwnsCompany(userId: string, companyId: string): Promise<boolean>;
}
