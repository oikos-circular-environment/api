import type {
	UserOrganizationSummary,
	UserOrganizationsRepository,
} from "../user-organizations-repository.js";

export class InMemoryUserOrganizationsRepository
	implements UserOrganizationsRepository
{
	public items: (UserOrganizationSummary & { userId: string })[] = [];

	async findByUserId(userId: string): Promise<UserOrganizationSummary[]> {
		return this.items
			.filter((item) => item.userId === userId)
			.map(({ userId: _userId, ...summary }) => summary);
	}
}
