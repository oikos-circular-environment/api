import type { UserCreateInput } from "@/generated/prisma/models.js";
import { prisma } from "@/lib/prisma.js";
import type { UsersRepository } from "@/modules/users/repositories/users-repository.js";

export class PrismaUsersRepository implements UsersRepository {
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    return user;
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    return user;
  }

  async create(data: UserCreateInput) {
    const user = await prisma.user.create({
      data,
    });

    return user;
  }

  async findAll() {
    const users = await prisma.user.findMany();

    return users;
  }
}
