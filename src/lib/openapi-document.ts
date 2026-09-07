import type { app } from "@/app.js";
import type { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";

// Better Auth tags its core (non-plugin) endpoints "Default"; rename only
// those to "Auth". Plugin endpoints (Organization, Admin, ...) already carry
// their own tag and must stay untouched.
// biome-ignore lint/suspicious/noExplicitAny: reshaping Better Auth's generated OpenAPI path item
function retagAuthOperations(pathItem: any): any {
	return Object.fromEntries(
		Object.entries(pathItem).map(([method, operation]) => {
			// biome-ignore lint/suspicious/noExplicitAny: reshaping Better Auth's generated OpenAPI operation
			const op = operation as any;
			return [
				method,
				op?.tags?.includes("Default") ? { ...op, tags: ["Auth"] } : op,
			];
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
		mergedDocument = {
			...swaggerDocument,
			paths: { ...swaggerDocument.paths, ...prefixedAuthPaths },
			components: {
				...swaggerDocument.components,
				schemas: {
					...swaggerDocument.components?.schemas,
					...authSchema.components?.schemas,
				},
				securitySchemes: {
					...swaggerDocument.components?.securitySchemes,
					...authSchema.components?.securitySchemes,
				},
			},
			tags: [
				...(swaggerDocument.tags ?? []),
				...(authSchema.tags ?? [])
					.filter((tag: { name: string }) => tag.name !== "Default")
					.filter((tag: { name: string }) => tag.name !== "Auth"),
				{
					name: "Auth",
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
