import { userSchema } from "../entities/user-entity.js";

export const userResponseSchema = userSchema.omit({
	deletion_job_id: true,
});

export type { User } from "../entities/user-entity.js";
export { userSchema } from "../entities/user-entity.js";
