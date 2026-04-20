import { prisma } from "@/lib/prisma.js";
import type { CreateProfile, UpdateProfile } from "@/modules/profiles/dtos/profiles-dto.js";
import type { ProfilesRepository } from "../profiles-repository.js";
import { type PrismaProfileWithRelations, profileMapper } from "./mappers/profile-mapper.js";

export class PrismaProfilesRepository implements ProfilesRepository {
  async findById(id: string) {
    const profile = await prisma.profile.findUnique({
      where: {
        id,
      },
      include: {
        profile_address: {
          include: {
            address: true,
          },
        },
      },
    });

    return profileMapper(profile as PrismaProfileWithRelations);
  }

  async findByUserId(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: {
        user_id: userId,
      },
      include: {
        profile_address: {
          include: {
            address: true,
          },
        },
      },
    });

    return profileMapper(profile as PrismaProfileWithRelations);
  }

  async create(data: CreateProfile) {
    const profile = await prisma.profile.create({
      data: {
        user_id: data.user_id,
        full_name: data.full_name,
        display_name: data.display_name,
        cpf: data.cpf,
        phone: data.phone,
        email: data.email,
        is_collector: data.is_collector,
      },
      include: {
        profile_address: {
          include: {
            address: true,
          },
        },
      },
    });

    const mappedProfile = profileMapper(profile as PrismaProfileWithRelations);

    if (!mappedProfile) {
      throw new Error("Failed to create profile");
    }

    return mappedProfile;
  }

  async update(id: string, data: UpdateProfile) {
    const currentProfile = await prisma.profile.findUnique({
      where: {
        id,
      },
      include: {
        profile_address: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!currentProfile) {
      return null;
    }

    const profile = await prisma.profile.update({
      where: {
        id,
      },
      data,
      include: {
        profile_address: {
          include: {
            address: true,
          },
        },
      },
    });

    return profileMapper(profile as PrismaProfileWithRelations);
  }
}
