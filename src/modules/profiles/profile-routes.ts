import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { SupabaseBucket } from "../common/providers/storage/supabase/supabase-bucket.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	addressSchema,
	createAddressSchema,
	createProfileSchema,
	profileImageSchema,
	profileSchema,
} from "./dtos/profiles-dto.js";
import { PrismaAddressesRepository } from "./repositories/prisma/addresses-repository-prisma.js";
import { PrismaProfilesRepository } from "./repositories/prisma/profiles-repository-prisma.js";
import { DeleteProfileImageUseCase } from "./use-cases/delete-profile-image-use-case.js";
import { GetProfileAddressUseCase } from "./use-cases/get-profile-address-use-case.js";
import { GetProfileUseCase } from "./use-cases/get-profile-use-case.js";
import { UpsertProfileImageUseCase } from "./use-cases/upsert-profile-image-use-case.js";
import { UpsertProfileUseCase } from "./use-cases/upsert-profile-use-case.js";

const PROFILES_TAG = "Profiles";
const PROFILES_ADDRESSES_TAG = "Profiles / Addresses";

export async function profileRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const profilesRepository = new PrismaProfilesRepository();
	const addressesRepository = new PrismaAddressesRepository();
	const storageProvider = new SupabaseBucket();

	const upsertProfileUseCase = new UpsertProfileUseCase(
		profilesRepository,
		addressesRepository,
	);
	const getProfileUseCase = new GetProfileUseCase(profilesRepository);
	const upsertProfileImageUseCase = new UpsertProfileImageUseCase(
		profilesRepository,
		storageProvider,
	);
	const deleteProfileImageUseCase = new DeleteProfileImageUseCase(
		profilesRepository,
		storageProvider,
	);
	const getProfileAddressUseCase = new GetProfileAddressUseCase(
		profilesRepository,
		addressesRepository,
	);

	typedApp.addHook("onRequest", async (request) => {
		await verifyJwt(request);
	});

	typedApp.put(
		"/profiles",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Upsert user profile",
				description:
					"Creates or updates the profile for the authenticated user. Optionally creates or updates the address in the same request.",
				body: createProfileSchema.omit({ user_id: true }).extend({
					address: createAddressSchema
						.omit({ profile_id: true })
						.optional()
						.nullable(),
				}),
				response: {
					200: z.object({
						profile: profileSchema,
					}),
					401: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const profile = await upsertProfileUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send({ profile });
		},
	);

	typedApp.get(
		"/profiles",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Get user profile",
				description: "Returns the profile of the authenticated user.",
				response: {
					200: z.object({
						profile: profileSchema.nullable(),
					}),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const profile = await getProfileUseCase.execute({ userId });

			return reply.send({
				profile: profile,
			});
		},
	);

	typedApp.put(
		"/profiles/avatar",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Upsert profile avatar",
				description:
					"Creates or replaces the authenticated user's profile image. Send a `multipart/form-data` request with a single file field named **`file`**. Accepted types: `image/jpeg`, `image/png`. Maximum size: 10MB.",
				consumes: ["multipart/form-data"],
				response: {
					200: profileImageSchema,
					400: appErrorSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					500: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const file = await request.file();

			if (!file) {
				throw new AppError(
					"Profile image file is required. Send a multipart/form-data request with a field named 'file'",
					"PROFILE_IMAGE_FILE_REQUIRED",
					400,
				);
			}

			if (file.fieldname !== "file") {
				throw new AppError(
					"Invalid field name. The file must be sent in a field named 'file'",
					"PROFILE_IMAGE_INVALID_FIELD_NAME",
					400,
				);
			}

			const profileImage = await upsertProfileImageUseCase.execute({
				userId,
				file: {
					fileName: file.filename,
					mimeType: file.mimetype,
					content: await file.toBuffer(),
				},
			});

			return reply.send(profileImage);
		},
	);

	typedApp.delete(
		"/profiles/images",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Delete profile image",
				description: "Deletes the authenticated user's profile image.",
				response: {
					202: z.null(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			await deleteProfileImageUseCase.execute({ userId });

			return reply.status(202).send(null);
		},
	);

	typedApp.get(
		"/profiles/addresses",
		{
			schema: withBearerAuth({
				tags: [PROFILES_ADDRESSES_TAG],
				summary: "Get profile address",
				description: "Returns only the authenticated user's profile address.",
				response: {
					200: z.object({
						address: addressSchema.nullable(),
					}),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const address = await getProfileAddressUseCase.execute({ userId });

			return reply.send({
				address,
			});
		},
	);
}
