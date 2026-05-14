import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Complaint,
	CreateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";
import type { UsersRepository } from "@/modules/users/repositories/users-repository.js";

type CreateComplaintUseCaseRequest = {
	userId: string;
	data: CreateComplaint;
};

export class CreateComplaintUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly usersRepository: UsersRepository,
	) {}

	async execute({
		userId,
		data,
	}: CreateComplaintUseCaseRequest): Promise<Complaint> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			throw new AppError("User not found", "USER_NOT_FOUND", 404);
		}

		return this.complaintsRepository.createForUser(userId, data);
	}
}
