import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma.js';
import { applyQuorumResolution } from './quorum-logic.js';

describe('applyQuorumResolution — fluxo de quórum', () => {
  const createdComplaintIds: string[] = [];
  const createdUserIds: string[] = [];

  async function createUser(): Promise<string> {
    const userId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
      userId,
      `quorum-test-${userId}@integration.test`,
    );
    createdUserIds.push(userId);
    return userId;
  }

  async function createComplaint(ownerId: string) {
    const c = await prisma.complaint.create({
      data: {
        id: randomUUID(),
        user_id: ownerId,
        status: 'OPEN',
        type: 'BURNING',
        date: new Date(),
        geospatial: {},
      },
    });
    createdComplaintIds.push(c.id);
    return c;
  }

  async function addVote(
    complaintId: string,
    userId: string,
    voteType: 'RESOLVED' | 'NOT_RESOLVED',
  ) {
    await prisma.complaintVote.create({
      data: { complaint_id: complaintId, user_id: userId, vote_type: voteType },
    });
  }

  afterEach(async () => {
    if (createdComplaintIds.length > 0) {
      await prisma.complaint.deleteMany({ where: { id: { in: createdComplaintIds } } });
      createdComplaintIds.length = 0;
    }
    if (createdUserIds.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        ...createdUserIds,
      );
      createdUserIds.length = 0;
    }
  });

  it('resolve complaint when owner votes RESOLVED (weight 2) + 3 others (weight 3) = 5', async () => {
    const ownerId = await createUser();
    const complaint = await createComplaint(ownerId);

    const voter1 = await createUser();
    const voter2 = await createUser();
    const voter3 = await createUser();

    await addVote(complaint.id, ownerId, 'RESOLVED'); // peso 2
    await addVote(complaint.id, voter1, 'RESOLVED'); // peso 1
    await addVote(complaint.id, voter2, 'RESOLVED'); // peso 1
    await addVote(complaint.id, voter3, 'RESOLVED'); // peso 1
    // Total positivo = 5, negativo = 0 → 5 >= 5 + 0 ✓

    const resolved = await applyQuorumResolution(complaint.id);

    expect(resolved).toBe(true);
    const updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.status).toBe('RESOLVED');
  });

  it('does NOT resolve when quorum is not met', async () => {
    const ownerId = await createUser();
    const complaint = await createComplaint(ownerId);

    const voter1 = await createUser();

    await addVote(complaint.id, ownerId, 'RESOLVED'); // peso 2
    await addVote(complaint.id, voter1, 'RESOLVED'); // peso 1
    // Total positivo = 3, negativo = 0 → 3 < 5 ✗

    const resolved = await applyQuorumResolution(complaint.id);

    expect(resolved).toBe(false);
    const updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.status).toBe('OPEN');
  });

  it('does NOT resolve when negative votes block quorum', async () => {
    const ownerId = await createUser();
    const complaint = await createComplaint(ownerId);

    const voter1 = await createUser();
    const voter2 = await createUser();
    const voter3 = await createUser();
    const voter4 = await createUser();

    await addVote(complaint.id, ownerId, 'RESOLVED'); // peso 2
    await addVote(complaint.id, voter1, 'RESOLVED'); // peso 1
    await addVote(complaint.id, voter2, 'RESOLVED'); // peso 1
    await addVote(complaint.id, voter3, 'RESOLVED'); // peso 1
    await addVote(complaint.id, voter4, 'NOT_RESOLVED'); // peso 1 negativo
    // Total positivo = 5, negativo = 1 → 5 < 5 + 1 = 6 ✗

    const resolved = await applyQuorumResolution(complaint.id);

    expect(resolved).toBe(false);
  });

  it('does NOT resolve when complaint is already RESOLVED', async () => {
    const ownerId = await createUser();
    const complaint = await createComplaint(ownerId);
    await prisma.complaint.update({ where: { id: complaint.id }, data: { status: 'RESOLVED' } });

    const resolved = await applyQuorumResolution(complaint.id);

    expect(resolved).toBe(false);
  });
});
