import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { AppError } from "@/modules/common/errors/app-error.js";
import type { Context } from "./context.js";

function mapAppErrorToTrpcError(error: AppError): TRPCError {
	const codeByStatus: Partial<Record<number, TRPCError["code"]>> = {
		400: "BAD_REQUEST",
		401: "UNAUTHORIZED",
		403: "FORBIDDEN",
		404: "NOT_FOUND",
		409: "CONFLICT",
	};

	return new TRPCError({
		code: codeByStatus[error.statusCode] ?? "INTERNAL_SERVER_ERROR",
		message: error.message,
		cause: error,
	});
}

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

const appErrorMiddleware = t.middleware(async ({ next }) => {
	try {
		return await next();
	} catch (cause) {
		if (cause instanceof AppError) {
			throw mapAppErrorToTrpcError(cause);
		}
		throw cause;
	}
});

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
	try {
		await ctx.req.jwtVerify();
	} catch {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized." });
	}

	const payload = ctx.req.user;
	if (
		typeof payload?.sub !== "string" ||
		payload.sub.length === 0 ||
		typeof payload.user?.id !== "string" ||
		payload.user.id.length === 0
	) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Invalid token payload",
		});
	}

	return next({
		ctx: {
			...ctx,
			userId: payload.sub,
		},
	});
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure.use(appErrorMiddleware);
export const protectedProcedure = t.procedure
	.use(appErrorMiddleware)
	.use(isAuthenticated);
