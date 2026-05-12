import z from "zod";
import { SupabaseBucket } from "@/modules/common/providers/storage/supabase/supabase-bucket.js";
import {
	complaintResumeSchema,
	complaintSchema,
	complaintsSchema,
	createComplaintSchema,
	updateComplaintSchema,
} from "@/modules/complaints/dtos/complaints-dto.js";
import { PrismaComplaintsRepository } from "@/modules/complaints/repositories/prisma/complaints-repository-prisma.js";
import { CancelComplaintUseCase } from "@/modules/complaints/use-cases/cancel-complaint-use-case.js";
import { CreateComplaintAttachmentUseCase } from "@/modules/complaints/use-cases/create-complaint-attachment-use-case.js";
import { CreateComplaintUseCase } from "@/modules/complaints/use-cases/create-complaint-use-case.js";
import { GetComplaintUseCase } from "@/modules/complaints/use-cases/get-complaint-use-case.js";
import { GetComplaintsDashboardUseCase } from "@/modules/complaints/use-cases/get-complaints-dashboard-use-case.js";
import { GetComplaintsUseCase } from "@/modules/complaints/use-cases/get-complaints-use-case.js";
import { ResolveComplaintUseCase } from "@/modules/complaints/use-cases/resolve-complaint-use-case.js";
import { UpdateComplaintUseCase } from "@/modules/complaints/use-cases/update-complaint-use-case.js";
import { PrismaUsersRepository } from "@/modules/users/repositories/prisma/users-repository-prisma.js";
import { protectedProcedure, router } from "../trpc.js";

const complaintsRepository = new PrismaComplaintsRepository();
const usersRepository = new PrismaUsersRepository();
const storageProvider = new SupabaseBucket();

const createComplaintUseCase = new CreateComplaintUseCase(
	complaintsRepository,
	usersRepository,
);
const getComplaintsUseCase = new GetComplaintsUseCase(complaintsRepository);
const getComplaintUseCase = new GetComplaintUseCase(complaintsRepository);
const updateComplaintUseCase = new UpdateComplaintUseCase(complaintsRepository);
const resolveComplaintUseCase = new ResolveComplaintUseCase(
	complaintsRepository,
);
const cancelComplaintUseCase = new CancelComplaintUseCase(complaintsRepository);
const createComplaintAttachmentUseCase = new CreateComplaintAttachmentUseCase(
	complaintsRepository,
	storageProvider,
);
const getComplaintsDashboardUseCase = new GetComplaintsDashboardUseCase(
	complaintsRepository,
);

const complaintIdSchema = z.object({
	id: z.string().uuid(),
});

const rpcFileSchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
	content: z.union([z.instanceof(Buffer), z.instanceof(Uint8Array)]),
});

function toBuffer(data: Buffer | Uint8Array): Buffer {
	return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export const complaintsTrpcRouter = router({
	list: protectedProcedure.output(complaintsSchema).query(async ({ ctx }) => {
		return getComplaintsUseCase.execute({ userId: ctx.userId });
	}),

	dashboard: protectedProcedure
		.output(complaintResumeSchema)
		.query(async ({ ctx }) => {
			return getComplaintsDashboardUseCase.execute({ userId: ctx.userId });
		}),

	byId: protectedProcedure
		.input(complaintIdSchema)
		.output(complaintSchema)
		.query(async ({ ctx, input }) => {
			return getComplaintUseCase.execute({
				userId: ctx.userId,
				complaintId: input.id,
			});
		}),

	create: protectedProcedure
		.input(createComplaintSchema)
		.output(complaintSchema)
		.mutation(async ({ ctx, input }) => {
			return createComplaintUseCase.execute({
				userId: ctx.userId,
				data: input,
			});
		}),

	update: protectedProcedure
		.input(complaintIdSchema.extend({ patch: updateComplaintSchema }))
		.output(complaintSchema)
		.mutation(async ({ ctx, input }) => {
			return updateComplaintUseCase.execute({
				userId: ctx.userId,
				complaintId: input.id,
				data: input.patch,
			});
		}),

	resolve: protectedProcedure
		.input(complaintIdSchema)
		.output(complaintSchema)
		.mutation(async ({ ctx, input }) => {
			return resolveComplaintUseCase.execute({
				userId: ctx.userId,
				complaintId: input.id,
			});
		}),

	cancel: protectedProcedure
		.input(complaintIdSchema)
		.output(complaintSchema)
		.mutation(async ({ ctx, input }) => {
			return cancelComplaintUseCase.execute({
				userId: ctx.userId,
				complaintId: input.id,
			});
		}),

	/**
	 * Variante RPC de POST `/complaints/attachments`: arquivo no corpo em vez de multipart.
	 */
	addAttachment: protectedProcedure
		.input(
			z.object({
				complaint_id: z.string().uuid(),
				file: rpcFileSchema,
			}),
		)
		.output(complaintSchema)
		.mutation(async ({ ctx, input }) => {
			return createComplaintAttachmentUseCase.execute({
				userId: ctx.userId,
				complaint_id: input.complaint_id,
				file: {
					fileName: input.file.fileName,
					mimeType: input.file.mimeType,
					content: toBuffer(input.file.content),
				},
			});
		}),
});
