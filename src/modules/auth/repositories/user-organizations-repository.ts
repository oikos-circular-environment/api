export type UserOrganizationSummary = {
	id: string;
	companyId: string | null;
	name: string;
	role: string;
};

export interface UserOrganizationsRepository {
	findByUserId(userId: string): Promise<UserOrganizationSummary[]>;
}
