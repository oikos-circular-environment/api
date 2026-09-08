import type { app } from "@/app.js";
import type { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";

const BETTER_AUTH_TAG = "Better Auth";

// Better Auth tags its core (non-plugin) endpoints "Default"; those become the
// bare "Better Auth" tag. Plugin endpoints (Organization, Admin, Anonymous...)
// already carry their own tag — prefix it so every Better Auth endpoint groups
// under "Better Auth / <plugin>" in the docs sidebar, matching this codebase's
// existing "Category / Subcategory" tag convention (e.g. "Companies / Addresses").
// biome-ignore lint/suspicious/noExplicitAny: reshaping Better Auth's generated OpenAPI path item
function retagAuthOperations(pathItem: any): any {
	return Object.fromEntries(
		Object.entries(pathItem).map(([method, operation]) => {
			// biome-ignore lint/suspicious/noExplicitAny: reshaping Better Auth's generated OpenAPI operation
			const op = operation as any;
			if (!op?.tags) {
				return [method, op];
			}
			const tags = op.tags.map((tag: string) =>
				tag === "Default" ? BETTER_AUTH_TAG : `${BETTER_AUTH_TAG} / ${tag}`,
			);
			return [method, { ...op, tags }];
		}),
	);
}

export function createOpenApiDocumentMerger(
	fastifyApp: typeof app,
	betterAuth: typeof auth,
) {
	// biome-ignore lint/suspicious/noExplicitAny: merging two independently-typed OpenAPI documents
	let mergedDocument: Record<string, any> | undefined;

	async function build(): Promise<void> {
		const authSchema = await betterAuth.api.generateOpenAPISchema();
		const authPaths = authSchema.paths ?? {};
		// Better Auth's generated schema keys are relative to `basePath` (e.g.
		// `/sign-in/email`, not `/auth/sign-in/email`) — prefix them so the docs
		// point at real, callable routes.
		const prefixedAuthPaths = Object.fromEntries(
			Object.entries(authPaths).map(([path, value]) => [
				path.startsWith("/auth") ? path : `/auth${path}`,
				retagAuthOperations(value),
			]),
		);
		// biome-ignore lint/suspicious/noExplicitAny: merging two independently-typed OpenAPI documents
		const swaggerDocument = fastifyApp.swagger() as Record<string, any>;
		// Only response entities are registered in the Zod registry (see the
		// `z.globalRegistry.add` calls next to each entity schema) — never
		// request DTOs — so the Models tab reads like Better Auth's: one
		// named model per domain entity, nothing else. fastify-type-provider-zod
		// still emits a "<Name>Input" pair for each registered schema regardless;
		// drop those, they're unreferenced by any request.
		const appSchemas = Object.fromEntries(
			Object.entries(swaggerDocument.components?.schemas ?? {}).filter(
				([name]) => !name.endsWith("Input"),
			),
		);
		mergedDocument = {
			...swaggerDocument,
			paths: { ...swaggerDocument.paths, ...prefixedAuthPaths },
			components: {
				...swaggerDocument.components,
				schemas: {
					...appSchemas,
					...authSchema.components?.schemas,
				},
				securitySchemes: {
					...swaggerDocument.components?.securitySchemes,
					...authSchema.components?.securitySchemes,
				},
			},
			tags: [
				...(swaggerDocument.tags ?? []),
				{
					name: BETTER_AUTH_TAG,
					description: "Better Auth (login, sessão, organizações)",
				},
			],
		};
	}

	function getDocument() {
		return mergedDocument ?? fastifyApp.swagger();
	}

	return { build, getDocument };
}
