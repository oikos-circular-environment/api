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
	updateAddressSchema,
	updateProfileSchema,
} from "./dtos/profiles-dto.js";
import { PrismaAddressesRepository } from "./repositories/prisma/addresses-repository-prisma.js";
import { PrismaProfilesRepository } from "./repositories/prisma/profiles-repository-prisma.js";
import { CreateProfileAddressUseCase } from "./use-cases/create-profile-address-use-case.js";
import { CreateProfileImageUseCase } from "./use-cases/create-profile-image-use-case.js";
import { CreateProfileUseCase } from "./use-cases/create-profile-use-case.js";
import { DeleteProfileImageUseCase } from "./use-cases/delete-profile-image-use-case.js";
import { GetProfileAddressUseCase } from "./use-cases/get-profile-address-use-case.js";
import { GetProfileUseCase } from "./use-cases/get-profile-use-case.js";
import { UpdateProfileAddressUseCase } from "./use-cases/update-profile-address-use-case.js";
import { UpdateProfileUseCase } from "./use-cases/update-profile-use-case.js";

const PROFILES_TAG = "Profiles";
const PROFILES_ADDRESSES_TAG = "Profiles / Addresses";

export async function profileRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const profilesRepository = new PrismaProfilesRepository();
	const addressesRepository = new PrismaAddressesRepository();
	const storageProvider = new SupabaseBucket();

	const createProfileUseCase = new CreateProfileUseCase(profilesRepository);
	const getProfileUseCase = new GetProfileUseCase(profilesRepository);
	const updateProfileUseCase = new UpdateProfileUseCase(profilesRepository);
	const createProfileAddressUseCase = new CreateProfileAddressUseCase(
		profilesRepository,
		addressesRepository,
	);
	const createProfileImageUseCase = new CreateProfileImageUseCase(
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
	const updateProfileAddressUseCase = new UpdateProfileAddressUseCase(
		profilesRepository,
		addressesRepository,
	);

	typedApp.addHook("onRequest", async (request) => {
		await verifyJwt(request);
	});

	typedApp.post(
		"/profiles",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Create user profile",
				description: "Creates a profile for the authenticated user.",
				body: createProfileSchema.omit({ user_id: true }),
				response: {
					200: profileSchema,
					401: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const profile = await createProfileUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(profile);
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
					200: profileSchema.nullable(),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const profile = await getProfileUseCase.execute({ userId });

			return reply.send(profile);
		},
	);

	typedApp.put(
		"/profiles",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Update user profile",
				description:
					"Updates only profile data for the authenticated user. Address fields are not handled by this route.",
				body: updateProfileSchema,
				response: {
					200: profileSchema.nullable(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const updatedProfile = await updateProfileUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(updatedProfile);
		},
	);

	typedApp.post(
		"/profiles/images",
		{
			schema: withBearerAuth({
				tags: [PROFILES_TAG],
				summary: "Create profile image",
				description:
					"Creates or updates the authenticated user's profile image. Only jpeg and png files are accepted up to 10MB.",
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
					"Profile image file is required",
					"PROFILE_IMAGE_FILE_REQUIRED",
					400,
				);
			}

			const profileImage = await createProfileImageUseCase.execute({
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
	("");
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

	typedApp.post(
		"/profiles/addresses",
		{
			schema: withBearerAuth({
				tags: [PROFILES_ADDRESSES_TAG],
				summary: "Create profile address",
				description: "Creates an address for the authenticated user's profile.",
				body: createAddressSchema.omit({ profile_id: true }),
				response: {
					200: addressSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const address = await createProfileAddressUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(address);
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
					200: addressSchema.nullable(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const address = await getProfileAddressUseCase.execute({ userId });

			return reply.send(address);
		},
	);

	typedApp.put(
		"/profiles/addresses",
		{
			schema: withBearerAuth({
				tags: [PROFILES_ADDRESSES_TAG],
				summary: "Update profile address",
				description:
					"Updates only address data for the authenticated user's profile.",
				body: updateAddressSchema,
				response: {
					200: addressSchema.nullable(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const updatedAddress = await updateProfileAddressUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send(updatedAddress);
		},
	);
}
