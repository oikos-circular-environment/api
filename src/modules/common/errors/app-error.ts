import z from "zod";

export const appErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
  statusCode: z.number(),
});

export type AppErrorResponse = z.infer<typeof appErrorSchema>;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message?: string, code?: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code || "APP_ERROR";
    this.statusCode = statusCode || 400;
  }

  toResponse(): AppErrorResponse {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}
