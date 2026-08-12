import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { makeStorageProvider } from "@/modules/common/providers/storage/make-storage-provider.js";
import { auth } from "../auth/providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../auth/providers/auth/better-auth/better-auth-auth-provider.js";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import { createVerifySession } from "../common/middlewares/verify-session.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	complaintResumeSchema,
	complaintSchema,
	complaintsSchema,
	complaintVoteSchema,
	createComplaintSchema,
	getComplaintsQuerySchema,
	getMapComplaintsQuerySchema,
	mapComplaintItemSchema,
	resolutionAttachmentSchema,
	resolutionSchema,
	submitResolutionSchema,
	submitVoteSchema,
	updateComplaintSchema,
} from "./dtos/complaints-dto.js";
import { PrismaCompanyOwnershipChecker } from "./providers/company-checker/prisma/prisma-company-checker.js";
import { BullMQJobDispatcher } from "./providers/queue/bullmq/bullmq-job-dispatcher.js";
import { PrismaComplaintsRepository } from "./repositories/prisma/complaints-repository-prisma.js";
import { AddResolutionAttachmentUseCase } from "./use-cases/add-resolution-attachment-use-case.js";
import { CancelComplaintUseCase } from "./use-cases/cancel-complaint-use-case.js";
import { CreateComplaintAttachmentUseCase } from "./use-cases/create-complaint-attachment-use-case.js";
import { CreateComplaintUseCase } from "./use-cases/create-complaint-use-case.js";
import { DeleteComplaintAttachmentUseCase } from "./use-cases/delete-complaint-attachment-use-case.js";
import { DeleteResolutionAttachmentUseCase } from "./use-cases/delete-resolution-attachment-use-case.js";
import { DeleteResolutionUseCase } from "./use-cases/delete-resolution-use-case.js";
import { GetComplaintUseCase } from "./use-cases/get-complaint-use-case.js";
import { GetComplaintVoteUseCase } from "./use-cases/get-complaint-vote-use-case.js";
import { GetComplaintsDashboardUseCase } from "./use-cases/get-complaints-dashboard-use-case.js";
import { GetComplaintsUseCase } from "./use-cases/get-complaints-use-case.js";
import { GetMapComplaintsUseCase } from "./use-cases/get-map-complaints-use-case.js";
import { GetResolutionsUseCase } from "./use-cases/get-resolutions-use-case.js";
import { ResolveComplaintUseCase } from "./use-cases/resolve-complaint-use-case.js";
import { SubmitResolutionUseCase } from "./use-cases/submit-resolution-use-case.js";
import { UpdateComplaintUseCase } from "./use-cases/update-complaint-use-case.js";
import { UpdateResolutionUseCase } from "./use-cases/update-resolution-use-case.js";
import { VoteComplaintUseCase } from "./use-cases/vote-complaint-use-case.js";

const COMPLAINTS_TAG = "Complaints";
const COMPLAINTS_PUBLIC_TAG = "Complaints / Public";
const COMPLAINTS_VOTES_TAG = "Complaints / Votes";
const COMPLAINTS_RESOLUTIONS_TAG = "Complaints / Resolutions";
const COMPLAINTS_ATTACHMENTS_TAG = "Complaints / Attachments";
const COMPLAINTS_DASHBOARD_TAG = "Complaints / Dashboard";

export async function complaintRoutes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const complaintsRepository = new PrismaComplaintsRepository();
	const storageProvider = makeStorageProvider();
	const jobDispatcher = new BullMQJobDispatcher();
	const companyChecker = new PrismaCompanyOwnershipChecker();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);

	const createComplaintUseCase = new CreateComplaintUseCase(
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
		companyChecker,
	);
	const updateResolutionUseCase = new UpdateResolutionUseCase(
		complaintsRepository,
	);
	const getResolutionsUseCase = new GetResolutionsUseCase(complaintsRepository);
	const deleteResolutionUseCase = new DeleteResolutionUseCase(
		complaintsRepository,
	);
	const addResolutionAttachmentUseCase = new AddResolutionAttachmentUseCase(
		complaintsRepository,
		storageProvider,
	);
	const deleteResolutionAttachmentUseCase =
		new DeleteResolutionAttachmentUseCase(
			complaintsRepository,
			storageProvider,
		);
	const cancelComplaintUseCase = new CancelComplaintUseCase(
		complaintsRepository,
	);
	const createComplaintAttachmentUseCase = new CreateComplaintAttachmentUseCase(
		complaintsRepository,
		storageProvider,
	);
	const deleteComplaintAttachmentUseCase = new DeleteComplaintAttachmentUseCase(
		complaintsRepository,
		storageProvider,
	);
	const getComplaintsDashboardUseCase = new GetComplaintsDashboardUseCase(
		complaintsRepository,
	);
	const getMapComplaintsUseCase = new GetMapComplaintsUseCase(
		complaintsRepository,
	);
	const getComplaintVoteUseCase = new GetComplaintVoteUseCase(
		complaintsRepository,
	);

	typedApp.addHook("onRequest", async (request) => {
		if ((request.routeOptions.config as { public?: boolean })?.public) return;
		await verifySession(request);
	});

	typedApp.get(
		"/complaints",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_TAG],
				summary: "List complaints",
				description:
					"Returns a paginated list of complaints for the authenticated user. Use `cursor` (the `next_cursor` from the previous response) for infinite scroll. Filter by `status` as needed.",
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
			const userId = request.authV2User.id;
			const { status, cursor, limit } = request.query;

			const result = await getComplaintsUseCase.execute({
				userId,
				filters: { status },
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
			const userId = request.authV2User.id;
			const dashboard = await getComplaintsDashboardUseCase.execute({ userId });
			return reply.send({ dashboard });
		},
	);

	typedApp.get(
		"/complaints/map",
		{
			config: { public: true },
			schema: {
				tags: [COMPLAINTS_PUBLIC_TAG],
				summary: "Get complaints on map",
				querystring: getMapComplaintsQuerySchema,
				response: {
					200: z.object({ complaints: z.array(mapComplaintItemSchema) }),
				},
			},
		},
		async (request, reply) => {
			const complaints = await getMapComplaintsUseCase.execute(request.query);
			return reply.send({ complaints });
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
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
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
					"Creates a new complaint with geospatial data. Pass `heading: null` when the device heading is unavailable.",
				body: createComplaintSchema,
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
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
					"Updates complaint fields. Accepts any combination of `date`, `observations`, `geospatial`, and `waste_category_ids`.",
				params: z.object({ id: z.uuid() }),
				body: updateComplaintSchema,
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
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
				params: z.object({ id: z.uuid() }),
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
			const userId = request.authV2User.id;
			const complaint = await resolveComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
				resolution: request.body,
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
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ complaint: complaintSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			const complaint = await cancelComplaintUseCase.execute({
				userId,
				complaintId: request.params.id,
			});
			return reply.send({ complaint });
		},
	);

	typedApp.get(
		"/complaints/:id/votes",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_VOTES_TAG],
				summary: "Get my vote on a complaint",
				description:
					"Returns the authenticated user's current vote on the given complaint, or null if they have not voted.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ vote: complaintVoteSchema.nullable() }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			const vote = await getComplaintVoteUseCase.execute({
				userId,
				complaintId: request.params.id,
			});
			return reply.send({ vote });
		},
	);

	typedApp.post(
		"/complaints/:id/votes",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_VOTES_TAG],
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
			const userId = request.authV2User.id;
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
				tags: [COMPLAINTS_VOTES_TAG],
				summary: "Remove vote from complaint",
				params: z.object({ id: z.uuid() }),
				response: {
					204: z.undefined(),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			await complaintsRepository.removeVoteFromComplaint(
				userId,
				request.params.id,
			);
			return reply.status(204).send();
		},
	);

	typedApp.get(
		"/complaints/:id/resolutions",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_RESOLUTIONS_TAG],
				summary: "List resolutions",
				description: "Returns all resolutions submitted for a complaint.",
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ resolutions: z.array(resolutionSchema) }),
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			const resolutions = await getResolutionsUseCase.execute({
				complaintId: request.params.id,
				userId,
			});
			return reply.send({ resolutions });
		},
	);

	typedApp.post(
		"/complaints/:id/resolutions",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_RESOLUTIONS_TAG],
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
			const userId = request.authV2User.id;
			await submitResolutionUseCase.execute({
				userId,
				complaintId: request.params.id,
				data: request.body,
			});
			return reply.status(204).send();
		},
	);

	typedApp.patch(
		"/complaints/:id/resolutions/:resolutionId",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_RESOLUTIONS_TAG],
				summary: "Update resolution",
				params: z.object({ id: z.uuid(), resolutionId: z.uuid() }),
				body: z.object({ description: z.string().min(1) }),
				response: {
					204: z.undefined(),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			await updateResolutionUseCase.execute({
				userId,
				complaintId: request.params.id,
				resolutionId: request.params.resolutionId,
				description: request.body.description,
			});
			return reply.status(204).send();
		},
	);

	typedApp.delete(
		"/complaints/:id/resolutions",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_RESOLUTIONS_TAG],
				summary: "Delete my resolution",
				description:
					"Deletes the authenticated user's resolution for this complaint.",
				params: z.object({ id: z.uuid() }),
				response: {
					204: z.undefined(),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			await deleteResolutionUseCase.execute({
				userId,
				complaintId: request.params.id,
			});
			return reply.status(204).send();
		},
	);

	typedApp.post(
		"/complaints/:id/resolutions/attachments",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_RESOLUTIONS_TAG],
				summary: "Upload resolution attachment",
				description:
					"Uploads an image to the authenticated user's resolution for this complaint.",
				consumes: ["multipart/form-data"],
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ attachment: resolutionAttachmentSchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					500: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			const file = await request.file();

			if (!file) {
				throw new AppError(
					"Resolution attachment file is required",
					"RESOLUTION_ATTACHMENT_FILE_REQUIRED",
					400,
				);
			}

			const attachment = await addResolutionAttachmentUseCase.execute({
				userId,
				complaintId: request.params.id,
				file: {
					fileName: file.filename,
					mimeType: file.mimetype,
					content: await file.toBuffer(),
				},
			});

			return reply.send({ attachment });
		},
	);

	typedApp.delete(
		"/complaints/:id/resolutions/attachments/:attachmentId",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_RESOLUTIONS_TAG],
				summary: "Delete resolution attachment",
				params: z.object({ id: z.uuid(), attachmentId: z.uuid() }),
				response: {
					204: z.undefined(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			await deleteResolutionAttachmentUseCase.execute({
				userId,
				complaintId: request.params.id,
				attachmentId: request.params.attachmentId,
			});
			return reply.status(204).send();
		},
	);

	typedApp.delete(
		"/complaints/:id/attachments/:attachmentId",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_ATTACHMENTS_TAG],
				summary: "Delete complaint attachment",
				description:
					"Deletes an attachment from the authenticated user's complaint.",
				params: z.object({ id: z.uuid(), attachmentId: z.uuid() }),
				response: {
					204: z.undefined(),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
			await deleteComplaintAttachmentUseCase.execute({
				userId,
				complaintId: request.params.id,
				attachmentId: request.params.attachmentId,
			});
			return reply.status(204).send();
		},
	);

	typedApp.post(
		"/complaints/:id/attachments",
		{
			schema: withBearerAuth({
				tags: [COMPLAINTS_ATTACHMENTS_TAG],
				summary: "Upload complaint attachment",
				description:
					"Uploads and attaches a file to an existing complaint. Send one file per request.",
				consumes: ["multipart/form-data"],
				params: z.object({ id: z.uuid() }),
				response: {
					200: z.object({ complaint: complaintSchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					404: appErrorSchema,
					500: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const userId = request.authV2User.id;
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
				complaintId: request.params.id,
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
