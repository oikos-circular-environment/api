import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma.js';
import { PrismaComplaintsRepository } from './complaints-repository-prisma.js';

describe('PrismaComplaintsRepository — findMapComplaints (PostGIS)', () => {
  const createdComplaintIds: string[] = [];
  const createdUserIds: string[] = [];

  async function insertUser(): Promise<string> {
    const userId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
      userId,
      `test-${userId}@integration.test`,
    );
    createdUserIds.push(userId);
    return userId;
  }

  async function insertComplaintWithLocation(
    lat: number,
    lon: number,
    type = 'BURNING',
    status = 'OPEN',
  ): Promise<string> {
    const id = randomUUID();
    const userId = await insertUser();

    await prisma.$executeRawUnsafe(
      `INSERT INTO complaints (id, user_id, status, type, complaint_method, created_at, location)
       VALUES ($1, $2, $3, $4, 'AUTOMATIC', NOW(),
               ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)`,
      id,
      userId,
      status,
      type,
      lon,
      lat,
    );

    createdComplaintIds.push(id);
    return id;
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

  it('returns complaints within radius', async () => {
    const repo = new PrismaComplaintsRepository();
    // Centro: São Paulo (-23.5505, -46.6333)
    await insertComplaintWithLocation(-23.5505, -46.6333); // dentro (0m)
    await insertComplaintWithLocation(-23.551, -46.634); // dentro (~90m)
    await insertComplaintWithLocation(-23.6, -46.7); // fora (>7km)

    const result = await repo.findMapComplaints({ lat: -23.5505, lon: -46.6333, radius: 500 });

    expect(result.length).toBe(2);
  });

  it('filters by type', async () => {
    const repo = new PrismaComplaintsRepository();
    await insertComplaintWithLocation(-23.5505, -46.6333, 'BURNING');
    await insertComplaintWithLocation(-23.5506, -46.6334, 'DEFORESTATION');

    const result = await repo.findMapComplaints({
      lat: -23.5505,
      lon: -46.6333,
      radius: 500,
      type: 'BURNING',
    });

    expect(result.every((c) => c.type === 'BURNING')).toBe(true);
  });

  it('excludes RESOLVED complaints by default', async () => {
    const repo = new PrismaComplaintsRepository();
    await insertComplaintWithLocation(-23.5505, -46.6333, 'BURNING', 'OPEN');
    await insertComplaintWithLocation(-23.5506, -46.6334, 'BURNING', 'RESOLVED');

    const result = await repo.findMapComplaints({ lat: -23.5505, lon: -46.6333, radius: 500 });

    expect(result.every((c) => c.status === 'OPEN')).toBe(true);
  });

  it('respects limit of 500', async () => {
    const repo = new PrismaComplaintsRepository();
    await insertComplaintWithLocation(-23.5505, -46.6333);

    const result = await repo.findMapComplaints({ lat: -23.5505, lon: -46.6333, radius: 1000 });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(500);
  });
});
