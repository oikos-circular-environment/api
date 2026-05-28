import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma.js";
import type { ComplaintsGroupingJobData } from "@/lib/queue/jobs.js";
import { getRedisUrl } from "@/lib/queue/redis.js";

export function createGroupComplaintsWorker() {
	return new Worker<ComplaintsGroupingJobData>(
		"complaints-grouping",
		async (job) => {
			const { complaintId } = job.data;

			// Busca a denúncia para obter tipo e localização
			const complaint = await prisma.complaint.findUnique({
				where: { id: complaintId },
				select: { id: true, type: true, status: true, location: true },
			});

			if (!complaint || complaint.status !== "OPEN") return;
			// Se não tem location ainda, não pode agrupar
			if (!complaint.location) return;

			// Busca denúncias OPEN no raio de 15m com mesmo type (excluindo a própria)
			const nearby = await prisma.$queryRaw<
				Array<{ id: string; event_group_id: string | null }>
			>`
        SELECT id, event_group_id
        FROM complaints
        WHERE id != ${complaintId}
          AND status = 'OPEN'
          AND type = ${complaint.type}
          AND event_group_id IS NOT NULL
          AND ST_DWithin(
            location,
            (SELECT location FROM complaints WHERE id = ${complaintId}),
            15
          )
        LIMIT 1
      `;

			if (nearby.length > 0 && nearby[0].event_group_id) {
				// Agrupa com o event_group_id existente
				await prisma.complaint.update({
					where: { id: complaintId },
					data: { event_group_id: nearby[0].event_group_id },
				});
			} else {
				// Cria novo grupo
				await prisma.complaint.update({
					where: { id: complaintId },
					data: { event_group_id: randomUUID() },
				});
			}
		},
		{ connection: { url: getRedisUrl(), maxRetriesPerRequest: null } },
	);
}
