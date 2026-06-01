import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import { SupabaseBucket } from "../common/providers/storage/supabase/supabase-bucket.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	complaintResumeSchema,
	complaintSchema,
	complaintsSchema,
	complaintVoteSchema,
	createComplaintManualSchema,
	createComplaintSchema,
	getComplaintsQuerySchema,
	getMapComplaintsQuerySchema,
	mapComplaintItemSchema,
	publicComplaintSchema,
	submitResolutionSchema,
	submitVoteSchema,
	updateComplaintSchema,
} from "./dtos/complaints-dto.js";
import { BullMQJobDispatcher } from "./providers/bullmq-job-dispatcher.js";
import { PrismaComplaintsRepository } from "./repositories/prisma/complaints-repository-prisma.js";
import { CancelComplaintUseCase } from "./use-cases/cancel-complaint-use-case.js";
import { CreateComplaintAttachmentUseCase } from "./use-cases/create-complaint-attachment-use-case.js";
import { CreateComplaintManualUseCase } from "./use-cases/create-complaint-manual-use-case.js";
import { CreateComplaintUseCase } from "./use-cases/create-complaint-use-case.js";
import { GetComplaintUseCase } from "./use-cases/get-complaint-use-case.js";
import { GetComplaintsDashboardUseCase } from "./use-cases/get-complaints-dashboard-use-case.js";
import { GetComplaintsUseCase } from "./use-cases/get-complaints-use-case.js";
import { GetMapComplaintsUseCase } from "./use-cases/get-map-complaints-use-case.js";
import { GetPublicComplaintUseCase } from "./use-cases/get-public-complaint-use-case.js";
import { ResolveComplaintUseCase } from "./use-cases/resolve-complaint-use-case.js";
import { SubmitResolutionUseCase } from "./use-cases/submit-resolution-use-case.js";
import { UpdateComplaintUseCase } from "./use-cases/update-complaint-use-case.js";
import { VoteComplaintUseCase } from "./use-cases/vote-complaint-use-case.js";

const COMPLAINTS_TAG = "Complaints";
const COMPLAINTS_ATTACHMENTS_TAG = "Complaints / Attachments";
const COMPLAINTS_DASHBOARD_TAG = "Complaints / Dashboard";

export async function complaintRoutes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const complaintsRepository = new PrismaComplaintsRepository();
	const storageProvider = new SupabaseBucket();
	const jobDispatcher = new BullMQJobDispatcher();

	const createComplaintUseCase = new CreateComplaintUseCase(
		complaintsRepository,
	);
	const createComplaintManualUseCase = new CreateComplaintManualUseCase(
		complaintsRepository,
	);
	const getComplaintsUseCase = new GetComplaintsUseCase(complaintsRepository);
	const getComplaintUseCase = new GetComplaintUseCase(complaintsRepository);
	const updateComplaintUseCase = new UpdateComplaintUseCase(
		complaintsRepository,
	);
	const resolveComplaintUseCase = new ResolveComplaintUseCase(
		complaintsRepository,
		jobDispatcher,
	);
	const voteComplaintUseCase = new VoteComplaintUseCase(
		complaintsRepository,
		jobDispatcher,
	);
	const submitResolutionUseCase = new SubmitResolutionUseCase(
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
	const getMapComplaintsUseCase = new GetMapComplaintsUseCase(
		complaintsRepository,
	);
	const getPublicComplaintUseCase = new GetPublicComplaintUseCase(
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
		"/complaints/map",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Get complaints on map",
				querystring: getMapComplaintsQuerySchema,
				response: {
					200: z.object({ complaints: z.array(mapComplaintItemSchema) }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const complaints = await getMapComplaintsUseCase.execute(request.query);
			return reply.send({ complaints });
		},
	);

	typedApp.get(
		"/complaints/:id/public",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Get public complaint detail",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ complaint: publicComplaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const complaint = await getPublicComplaintUseCase.execute({
				complaintId: request.params.id,
			});
			return reply.send({ complaint });
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
		"/complaints/manual",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Create manual complaint",
				description:
					"Creates a complaint from existing media with address provided by the user.",
				body: createComplaintManualSchema,
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await createComplaintManualUseCase.execute({
				userId,
				data: request.body,
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
				description: "Updates only the basic complaint fields: observations.",
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
				description:
					"Marks the authenticated user's complaint as resolved. Requires a resolution description.",
				params: z.object({
					id: z.uuid(),
				}),
				body: submitResolutionSchema,
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const complaint = await resolveComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
				resolution: request.body,
			});

			return reply.send({ complaint });
		},
	);

	typedApp.post(
		"/complaints/:id/votes",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Vote on complaint",
				params: z.object({ id: z.uuid() }),
				body: submitVoteSchema,
				response: {
					200: z.object({ vote: complaintVoteSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			const vote = await voteComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
				voteType: request.body.vote_type,
			});
			return reply.send({ vote });
		},
	);

	typedApp.delete(
		"/complaints/:id/votes",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Remove vote from complaint",
				params: z.object({ id: z.uuid() }),
				response: {
					204: z.undefined(),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			await complaintsRepository.removeVoteFromComplaint(
				userId,
				request.params.id,
			);
			return reply.status(204).send();
		},
	);

	typedApp.post(
		"/complaints/:id/resolutions",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Submit resolution",
				params: z.object({ id: z.uuid() }),
				body: submitResolutionSchema,
				response: {
					204: z.undefined(),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			await submitResolutionUseCase.execute({
				userId,
				complaintId: request.params.id,
				data: request.body,
			});
			return reply.status(204).send();
		},
	);

	typedApp.patch(
		"/complaints/:id/resolutions",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "Update resolution",
				params: z.object({ id: z.uuid() }),
				body: submitResolutionSchema,
				response: {
					204: z.undefined(),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.user.sub;
			await submitResolutionUseCase.execute({
				userId,
				complaintId: request.params.id,
				data: request.body,
			});
			return reply.status(204).send();
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
		"/complaints/:id/captures/:captureId/attachments",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_ATTACHMENTS_TAG],
				summary: "Create complaint capture attachment",
				description:
					"Uploads and attaches a file to an existing complaint capture.",
				consumes: ["multipart/form-data"],
				params: z.object({
					id: z.uuid(),
					captureId: z.uuid(),
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
				capture_id: request.params.captureId,
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
