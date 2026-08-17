import type { UserCreateInput } from "@/generated/prisma/models.js";
import { prisma } from "@/lib/prisma.js";
import type { UsersRepository } from "@/modules/accounts/repositories/users-repository.js";

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

	async findByIdWithPassword(id: string) {
		const user = await prisma.user.findUnique({
			where: { id },
			select: { id: true, email: true, password: true },
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

	async markAsDeleted(userId: string, deletionJobId: string) {
		const user = await prisma.user.update({
			where: { id: userId },
			data: { deleted_at: new Date(), deletion_job_id: deletionJobId },
		});

		return user;
	}

	async cancelDeletion(userId: string) {
		const user = await prisma.user.update({
			where: { id: userId },
			data: { deleted_at: null, deletion_job_id: null },
		});

		return user;
	}

	async updatePassword(userId: string, passwordHash: string) {
		await prisma.user.update({
			where: { id: userId },
			data: { password: passwordHash },
		});
	}

	async delete(userId: string) {
		await prisma.user.delete({ where: { id: userId } });
	}
}
