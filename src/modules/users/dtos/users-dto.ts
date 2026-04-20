import z from "zod";

export const createUserSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type CreateUser = z.infer<typeof createUserSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  password: z.string(),
  created_at: z.date(),
});

export type User = z.infer<typeof userSchema>;
