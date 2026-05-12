import { companiesTrpcRouter } from "./routers/companies-trpc-router.js";
import { complaintsTrpcRouter } from "./routers/complaints-trpc-router.js";
import { profilesTrpcRouter } from "./routers/profiles-trpc-router.js";
import { usersTrpcRouter } from "./routers/users-trpc-router.js";
import { router } from "./trpc.js";

export const appRouter = router({
	users: usersTrpcRouter,
	companies: companiesTrpcRouter,
	profiles: profilesTrpcRouter,
	complaints: complaintsTrpcRouter,
});

export type AppRouter = typeof appRouter;
