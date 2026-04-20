import type { FastifyInstance } from "fastify";

export async function companiesRoutes(app: FastifyInstance) {
  app.get("/companies", async (request, reply) => {
    return reply.send({
      message: "List of companies",
    });
  });
}
