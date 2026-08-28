import { randomUUID } from "node:crypto";
import type { OrganizationProvider } from "./organization-provider.js";

export class FakeOrganizationProvider implements OrganizationProvider {
	public created: { name: string; userId: string; organizationId: string }[] =
		[];

	async createOrganization({ name, userId }: { name: string; userId: string }) {
		const organizationId = randomUUID();
		this.created.push({ name, userId, organizationId });

		return { organizationId };
	}
}
