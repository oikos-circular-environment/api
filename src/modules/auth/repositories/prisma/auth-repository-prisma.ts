import { prisma } from "@/lib/prisma.js";
import type { AuthRepository } from "../auth-repository.js";

export class PrismaAuthRepository implements AuthRepository {
	async findByEmail(email: string) {
		return prisma.user.findUnique({
			where: { email },
			select: { id: true, email: true, password: true },
		});
	}

	async findById(id: string) {
		return prisma.user.findUnique({
			where: { id },
			select: { id: true, email: true },
		});
	}
}
