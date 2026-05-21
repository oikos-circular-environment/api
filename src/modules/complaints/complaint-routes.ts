import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { SupabaseBucket } from "../common/providers/storage/supabase/supabase-bucket.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import { PrismaUsersRepository } from "../users/repositories/prisma/users-repository-prisma.js";
import {
	complaintResumeSchema,
	complaintSchema,
	complaintsSchema,
	createComplaintAttachmentSchema,
	createComplaintSchema,
	getComplaintsQuerySchema,
	updateComplaintSchema,
} from "./dtos/complaints-dto.js";
import { PrismaComplaintsRepository } from "./repositories/prisma/complaints-repository-prisma.js";
import { CancelComplaintUseCase } from "./use-cases/cancel-complaint-use-case.js";
import { CreateComplaintAttachmentUseCase } from "./use-cases/create-complaint-attachment-use-case.js";
import { CreateComplaintUseCase } from "./use-cases/create-complaint-use-case.js";
import { GetComplaintUseCase } from "./use-cases/get-complaint-use-case.js";
import { GetComplaintsDashboardUseCase } from "./use-cases/get-complaints-dashboard-use-case.js";
import { GetComplaintsUseCase } from "./use-cases/get-complaints-use-case.js";
import { ResolveComplaintUseCase } from "./use-cases/resolve-complaint-use-case.js";
import { UpdateComplaintUseCase } from "./use-cases/update-complaint-use-case.js";

const COMPLAINTS_TAG = "Complaints";
const COMPLAINTS_ATTACHMENTS_TAG = "Complaints / Attachments";
const COMPLAINTS_DASHBOARD_TAG = "Complaints / Dashboard";

export async function complaintRoutes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const complaintsRepository = new PrismaComplaintsRepository();
	const usersRepository = new PrismaUsersRepository();
	const storageProvider = new SupabaseBucket();

	const createComplaintUseCase = new CreateComplaintUseCase(
		complaintsRepository,
		usersRepository,
	);
	const getComplaintsUseCase = new GetComplaintsUseCase(complaintsRepository);
	const getComplaintUseCase = new GetComplaintUseCase(complaintsRepository);
	const updateComplaintUseCase = new UpdateComplaintUseCase(
		complaintsRepository,
	);
	const resolveComplaintUseCase = new ResolveComplaintUseCase(
		complaintsRepository,
	);
	const cancelComplaintUseCase = new CancelComplaintUseCase(
		complaintsRepository,
	);
	const createComplaintAttachmentUseCase = new CreateComplaintAttachmentUseCase(
		complaintsRepository,
		storageProvider,
	);
	const getComplaintsDashboardUseCase = new GetComplaintsDashboardUseCase(
		complaintsRepository,
	);

	typedApp.addHook("onRequest", async (request) => {
		await verifyJwt(request);
	});

	typedApp.get(
		"/complaints",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "List complaints",
				description:
					"Returns a paginated list of complaints for the authenticated user. Use `cursor` (the `next_cursor` from the previous response) for infinite scroll. Filter by `type` and/or `status` as needed.",
				querystring: getComplaintsQuerySchema,
				response: {
					200: z.object({
						complaints: complaintsSchema,
						next_cursor: z.string().datetime().nullable(),
					}),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const { type, status, cursor, limit } = request.query;

			const result = await getComplaintsUseCase.execute({
				userId,
				filters: { type, status },
				cursor: cursor ? new Date(cursor) : undefined,
				limit,
			});

			return reply.send(result);
		},
	);

	typedApp.get(
		"/complaints/dashboard",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_DASHBOARD_TAG],
				summary: "Get complaints dashboard",
				description:
					"Returns a summary of complaint statuses for the authenticated user.",
				response: {
					200: z.object({ dashboard: complaintResumeSchema }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const dashboard = await getComplaintsDashboardUseCase.execute({ userId });

			return reply.send({ dashboard });
		},
	);

	typedApp.get(
		"/complaints/:id",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Get complaint by id",
				description:
					"Returns the full complaint data for the authenticated user.",
				params: z.object({
					id: z.uuid(),
				}),
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await getComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
			});

			return reply.send({ complaint });
		},
	);

	typedApp.post(
		"/complaints",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Create complaint",
				description:
					"Creates a complaint with raw geospatial data and no attachment.",
				body: createComplaintSchema,
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await createComplaintUseCase.execute({
				userId,
				data: request.body,
			});

			return reply.send({ complaint });
		},
	);

	typedApp.patch(
		"/complaints/:id",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Update complaint",
				description:
					"Updates only the basic complaint fields: type and observations.",
				params: z.object({
					id: z.uuid(),
				}),
				body: updateComplaintSchema,
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await updateComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
				data: request.body,
			});

			return reply.send({ complaint });
		},
	);

	typedApp.patch(
		"/complaints/:id/resolved",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Resolve complaint",
				description: "Marks the authenticated user's complaint as resolved.",
				params: z.object({
					id: z.uuid(),
				}),
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await resolveComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
			});

			return reply.send({ complaint });
		},
	);

	typedApp.patch(
		"/complaints/:id/canceled",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Cancel complaint",
				description: "Marks the authenticated user's complaint as canceled.",
				params: z.object({
					id: z.uuid(),
				}),
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await cancelComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
			});

			return reply.send({ complaint });
		},
	);

	typedApp.post(
		"/complaints/:id/attachments",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_ATTACHMENTS_TAG],
				summary: "Create complaint attachment",
				description: "Uploads and attaches a file to an existing complaint.",
				consumes: ["multipart/form-data"],
				params: z.object({
					id: z.uuid(),
				}),
				response: {
					200: z.object({ complaint: complaintSchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					409: appErrorSchema,
					500: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const file = await request.file();

			if (!file) {
				throw new AppError(
					"Complaint attachment file is required",
					"COMPLAINT_ATTACHMENT_FILE_REQUIRED",
					400,
				);
			}

			const complaint = await createComplaintAttachmentUseCase.execute({
				userId,
				complaint_id: request.params.id,
				file: {
					fileName: file.filename,
					mimeType: file.mimetype,
					content: await file.toBuffer(),
				},
			});

			return reply.send({ complaint });
		},
	);
}
