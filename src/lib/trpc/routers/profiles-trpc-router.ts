import z from "zod";
import { SupabaseBucket } from "@/modules/common/providers/storage/supabase/supabase-bucket.js";
import {
	addressSchema,
	createAddressSchema,
	createProfileSchema,
	profileImageSchema,
	profileSchema,
	updateAddressSchema,
	updateProfileSchema,
} from "@/modules/profiles/dtos/profiles-dto.js";
import { PrismaAddressesRepository } from "@/modules/profiles/repositories/prisma/addresses-repository-prisma.js";
import { PrismaProfilesRepository } from "@/modules/profiles/repositories/prisma/profiles-repository-prisma.js";
import { CreateProfileAddressUseCase } from "@/modules/profiles/use-cases/create-profile-address-use-case.js";
import { CreateProfileImageUseCase } from "@/modules/profiles/use-cases/create-profile-image-use-case.js";
import { CreateProfileUseCase } from "@/modules/profiles/use-cases/create-profile-use-case.js";
import { DeleteProfileImageUseCase } from "@/modules/profiles/use-cases/delete-profile-image-use-case.js";
import { GetProfileAddressUseCase } from "@/modules/profiles/use-cases/get-profile-address-use-case.js";
import { GetProfileUseCase } from "@/modules/profiles/use-cases/get-profile-use-case.js";
import { UpdateProfileAddressUseCase } from "@/modules/profiles/use-cases/update-profile-address-use-case.js";
import { UpdateProfileUseCase } from "@/modules/profiles/use-cases/update-profile-use-case.js";
import { protectedProcedure, router } from "../trpc.js";

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

const rpcFileSchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
	content: z.union([z.instanceof(Buffer), z.instanceof(Uint8Array)]),
});

function toBuffer(data: Buffer | Uint8Array): Buffer {
	return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export const profilesTrpcRouter = router({
	create: protectedProcedure
		.input(createProfileSchema.omit({ user_id: true }))
		.output(profileSchema)
		.mutation(async ({ ctx, input }) => {
			return createProfileUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),

	get: protectedProcedure
		.output(profileSchema.nullable())
		.query(async ({ ctx }) => {
			return getProfileUseCase.execute({ userId: ctx.userId });
		}),

	update: protectedProcedure
		.input(updateProfileSchema)
		.output(profileSchema.nullable())
		.mutation(async ({ ctx, input }) => {
			return updateProfileUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),

	/**
	 * Variante RPC de POST `/profiles/images`: arquivo no corpo (Buffer) em vez de multipart.
	 */
	uploadImage: protectedProcedure
		.input(rpcFileSchema)
		.output(profileImageSchema)
		.mutation(async ({ ctx, input }) => {
			return createProfileImageUseCase.execute({
				userId: ctx.userId,
				file: {
					fileName: input.fileName,
					mimeType: input.mimeType,
					content: toBuffer(input.content),
				},
			});
		}),

	deleteImage: protectedProcedure.mutation(async ({ ctx }) => {
		await deleteProfileImageUseCase.execute({ userId: ctx.userId });
		return null;
	}),

	createAddress: protectedProcedure
		.input(createAddressSchema.omit({ profile_id: true }))
		.output(addressSchema)
		.mutation(async ({ ctx, input }) => {
			return createProfileAddressUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),

	getAddress: protectedProcedure
		.output(addressSchema.nullable())
		.query(async ({ ctx }) => {
			return getProfileAddressUseCase.execute({ userId: ctx.userId });
		}),

	updateAddress: protectedProcedure
		.input(updateAddressSchema)
		.output(addressSchema.nullable())
		.mutation(async ({ ctx, input }) => {
			return updateProfileAddressUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),
});
