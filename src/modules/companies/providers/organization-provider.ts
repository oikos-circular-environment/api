export interface OrganizationProvider {
	createOrganization(args: {
		name: string;
		userId: string;
	}): Promise<{ organizationId: string }>;
}
