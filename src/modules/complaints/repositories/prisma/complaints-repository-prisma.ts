import { prisma } from "@/lib/prisma.js";
import {
	type Complaint,
	type ComplaintAttachment,
	type ComplaintResume,
	type ComplaintStatus,
	type CreateComplaint,
	geospatialSchema,
	type SaveComplaintAttachment,
	type UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type PrismaUserComplaintPayload = {
	status: ComplaintStatus;
	created_at: Date;
	complaint: {
		id: string;
		date: Date;
		type: Complaint["type"];
		observations: string | null;
		geospatial: unknown;
		attachment: {
			id: string;
			url: string;
			file_name: string;
			path: string;
			base64: string;
			type: ComplaintAttachment["type"];
			created_at: Date;
		} | null;
	};
};

function mapAttachment(
	attachment: PrismaUserComplaintPayload["complaint"]["attachment"],
): ComplaintAttachment | null {
	if (!attachment) {
		return null;
	}

	return {
		id: attachment.id,
		url: attachment.url,
		file_name: attachment.file_name,
		path: attachment.path,
		base64: attachment.base64,
		type: attachment.type,
		created_at: attachment.created_at,
	};
}

function mapComplaint(payload: PrismaUserComplaintPayload): Complaint {
	return {
		id: payload.complaint.id,
		date: payload.complaint.date,
		type: payload.complaint.type,
		observations: payload.complaint.observations,
		geospatial: geospatialSchema.parse(payload.complaint.geospatial),
		status: payload.status,
		attachment: mapAttachment(payload.complaint.attachment),
		created_at: payload.created_at,
	};
}

export class PrismaComplaintsRepository implements ComplaintsRepository {
	async findManyByUserId(userId: string) {
		const userComplaints = await prisma.userComplaint.findMany({
			where: {
				user_id: userId,
			},
			include: {
				complaint: {
					include: {
						attachment: true,
					},
				},
			},
			orderBy: {
				created_at: "desc",
			},
		});

		return userComplaints.map((item) => mapComplaint(item));
	}

	async findByUserAndComplaintId(userId: string, complaintId: string) {
		const userComplaint = await prisma.userComplaint.findFirst({
			where: {
				user_id: userId,
				complaint_id: complaintId,
			},
			include: {
				complaint: {
					include: {
						attachment: true,
					},
				},
			},
		});

		if (!userComplaint) {
			return null;
		}

		return mapComplaint(userComplaint);
	}

	async createForUser(userId: string, data: CreateComplaint) {
		const complaint = await prisma.$transaction(async (transaction) => {
			const createdComplaint = await transaction.complaint.create({
				data: {
					date: data.date,
					type: data.type,
					observations: data.observations ?? null,
					geospatial: data.geospatial,
				},
			});

			const createdUserComplaint = await transaction.userComplaint.create({
				data: {
					user_id: userId,
					complaint_id: createdComplaint.id,
					status: "OPEN",
				},
				include: {
					complaint: {
						include: {
							attachment: true,
						},
					},
				},
			});

			return createdUserComplaint;
		});

		return mapComplaint(complaint);
	}

	async updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	) {
		const userComplaint = await prisma.userComplaint.findFirst({
			where: {
				user_id: userId,
				complaint_id: complaintId,
			},
			select: {
				complaint_id: true,
			},
		});

		if (!userComplaint) {
			return null;
		}

		await prisma.complaint.update({
			where: {
				id: complaintId,
			},
			data,
		});

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	) {
		const updatedRows = await prisma.userComplaint.updateMany({
			where: {
				user_id: userId,
				complaint_id: complaintId,
			},
			data: {
				status,
			},
		});

		if (updatedRows.count === 0) {
			return null;
		}

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async attachByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: SaveComplaintAttachment,
	) {
		const attachedComplaintId = await prisma.$transaction(
			async (transaction) => {
				const userComplaint = await transaction.userComplaint.findFirst({
					where: {
						user_id: userId,
						complaint_id: complaintId,
					},
					select: {
						complaint_id: true,
					},
				});

				if (!userComplaint) {
					return null;
				}

				const attachment = await transaction.complaintAttachment.create({
					data: {
						url: data.url,
						file_name: data.file_name,
						path: data.path,
						base64: data.base64,
						type: data.type,
					},
				});

				const updateResult = await transaction.complaint.updateMany({
					where: {
						id: complaintId,
						attachment_id: null,
					},
					data: {
						attachment_id: attachment.id,
					},
				});

				if (updateResult.count === 0) {
					await transaction.complaintAttachment.delete({
						where: {
							id: attachment.id,
						},
					});

					return null;
				}

				return complaintId;
			},
		);

		if (!attachedComplaintId) {
			return null;
		}

		return this.findByUserAndComplaintId(userId, attachedComplaintId);
	}

	async getDashboardByUserId(userId: string) {
		const groupedStatuses = await prisma.userComplaint.groupBy({
			by: ["status"],
			where: {
				user_id: userId,
			},
			_count: {
				status: true,
			},
		});

		const byStatus = new Map<ComplaintStatus, number>();

		for (const item of groupedStatuses) {
			byStatus.set(item.status as ComplaintStatus, item._count.status);
		}

		const open = byStatus.get("OPEN") ?? 0;
		const pending = byStatus.get("IN_PROGRESS") ?? 0;
		const resolved = byStatus.get("RESOLVED") ?? 0;
		const canceled = byStatus.get("CANCELED") ?? 0;
		const rejected = byStatus.get("REJECTED") ?? 0;

		return {
			total: open + pending + resolved + canceled + rejected,
			open,
			pending,
			resolved,
			canceled,
			rejected,
		} satisfies ComplaintResume;
	}
}
