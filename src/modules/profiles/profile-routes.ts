import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
  addressSchema,
  createAddressSchema,
  createProfileSchema,
  profileSchema,
  updateAddressSchema,
  updateProfileSchema,
} from "./dtos/profiles-dto.js";
import { PrismaAddressesRepository } from "./repositories/prisma/addresses-repository-prisma.js";
import { PrismaProfilesRepository } from "./repositories/prisma/profiles-repository-prisma.js";
import { CreateProfileAddressUseCase } from "./use-cases/create-profile-address-use-case.js";
import { CreateProfileUseCase } from "./use-cases/create-profile-use-case.js";
import { GetProfileAddressUseCase } from "./use-cases/get-profile-address-use-case.js";
import { GetProfileUseCase } from "./use-cases/get-profile-use-case.js";
import { UpdateProfileAddressUseCase } from "./use-cases/update-profile-address-use-case.js";
import { UpdateProfileUseCase } from "./use-cases/update-profile-use-case.js";

export async function profileRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();
  const profilesRepository = new PrismaProfilesRepository();
  const addressesRepository = new PrismaAddressesRepository();

  const createProfileUseCase = new CreateProfileUseCase(profilesRepository);
  const getProfileUseCase = new GetProfileUseCase(profilesRepository);
  const updateProfileUseCase = new UpdateProfileUseCase(profilesRepository);
  const createProfileAddressUseCase = new CreateProfileAddressUseCase(
    profilesRepository,
    addressesRepository,
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
        tags: ["Profiles"],
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
        tags: ["Profiles"],
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
        tags: ["Profiles"],
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
    "/profiles/addresses",
    {
      schema: withBearerAuth({
        tags: ["Profiles"],
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
        tags: ["Profiles"],
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
        tags: ["Profiles"],
        summary: "Update profile address",
        description: "Updates only address data for the authenticated user's profile.",
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
