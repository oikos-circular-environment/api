import { Queue } from 'bullmq';
import { getRedisUrl } from './redis.js';

function makeConnectionOptions() {
  return { url: getRedisUrl(), maxRetriesPerRequest: null } as const;
}

export const complaintsGroupingQueue = new Queue('complaints-grouping', {
  connection: makeConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const complaintsQuorumQueue = new Queue('complaints-quorum', {
  connection: makeConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});
