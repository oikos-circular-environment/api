import { randomUUID } from "node:crypto";
import type { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { OrganizationProvider } from "./organization-provider.js";

function slugify(name: string): string {
	return name
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export class BetterAuthOrganizationProvider implements OrganizationProvider {
	constructor(private readonly authInstance: typeof auth) {}

	async createOrganization({ name, userId }: { name: string; userId: string }) {
		// No `headers` key on purpose: passing `userId` without `headers` is what makes
		// Better Auth treat this as a server-side/system action (creatorRole applies as
		// the member's role) instead of trying to resolve a session from the request.
		const slug = `${slugify(name) || "org"}-${randomUUID().slice(0, 8)}`;

		const organization = await this.authInstance.api.createOrganization({
			body: { name, slug, userId },
		});

		if (!organization) {
			throw new AppError(
				"Failed to create organization",
				"ORGANIZATION_CREATE_FAILED",
				500,
			);
		}

		return { organizationId: organization.id };
	}
}
