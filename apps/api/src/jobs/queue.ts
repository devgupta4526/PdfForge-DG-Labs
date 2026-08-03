/**
 * BullMQ wiring (Upstash Redis over TCP/TLS) — used when JOB_RUNNER=bullmq.
 *
 * IMPORTANT — about Upstash: BullMQ requires the standard Redis protocol
 * (RESP) over a long-lived TCP connection. Upstash's HTTP REST API
 * (`@upstash/redis`) is **not** compatible with BullMQ. Use the TLS endpoint
 * shown under "Connect to your database → TLS/SSL" in the Upstash dashboard
 * (a `rediss://default:TOKEN@<region>.upstash.io:6379` URL).
 *
 * ioredis configuration knobs that matter for BullMQ:
 *   - maxRetriesPerRequest: null     (REQUIRED — workers block forever otherwise)
 *   - enableReadyCheck:     false    (recommended for managed Redis hosts)
 *
 * This module exposes generic primitives (`getQueue`, `createWorker`,
 * `closeQueues`) and is consumed by `bullmq-scheduler.ts`. Importing it
 * does NOT open a Redis connection — connections are lazy on first queue/worker.
 */

import { Queue, Worker, QueueEvents, type ConnectionOptions, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const clients = new Set<Redis>();

function makeRedisClient(label: string): Redis {
  const url = env.REDIS_URL;
  if (!url) {
    throw new Error(
      `[queue] makeRedisClient(${label}) called without REDIS_URL. ` +
        `Set JOB_RUNNER=memory for dev or provide REDIS_URL for BullMQ.`,
    );
  }
  const isTls = url.startsWith('rediss://');

  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectionName: `pdf-forge-${label}`,
    lazyConnect: false,
    retryStrategy: (times: number) => Math.min(times * 250, 5000),
    ...(isTls ? { tls: {} } : {}),
  });

  client.on('connect', () => logger.info('Redis connected', { role: label }));
  client.on('ready', () => logger.debug('Redis ready', { role: label }));
  client.on('reconnecting', (delayMs: number) =>
    logger.warn('Redis reconnecting', { role: label, delayMs }),
  );
  client.on('end', () => logger.warn('Redis connection closed', { role: label }));
  client.on('error', (err: Error) =>
    logger.error('Redis error', { role: label, error: err.message }),
  );

  clients.add(client);
  return client;
}

export type QueueConnection = ConnectionOptions;

let cachedProducerConn: Redis | undefined;
function getProducerConnection(): Redis {
  if (!cachedProducerConn) cachedProducerConn = makeRedisClient('producer');
  return cachedProducerConn;
}

/* ─────────────────────────────────────────────────────────────────
 * Generic queue factory
 * ──────────────────────────────────────────────────────────────── */

const queueCache = new Map<string, Queue>();

export function getQueue<TData, TResult = unknown, TName extends string = string>(
  name: string,
): Queue<TData, TResult, TName> {
  const existing = queueCache.get(name);
  if (existing) return existing as Queue<TData, TResult, TName>;

  const queue = new Queue<TData, TResult, TName>(name, {
    connection: getProducerConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { count: 1000, age: 24 * 3600 },
      removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
    },
  });

  queue.on('error', (err) => logger.error('Queue error', { queue: name, error: err.message }));

  queueCache.set(name, queue);
  logger.info('Queue ready', { queue: name });
  return queue;
}

/* ─────────────────────────────────────────────────────────────────
 * Worker + QueueEvents factories
 * ──────────────────────────────────────────────────────────────── */

interface Closeable {
  close(): Promise<void>;
}
const workerRegistry = new Set<Closeable>();
const eventsRegistry = new Set<Closeable>();

export interface CreateWorkerOptions<TData, TResult, TName extends string> {
  name: string;
  processor: (job: Job<TData, TResult, TName>) => Promise<TResult>;
  concurrency?: number;
}

export function createWorker<TData, TResult, TName extends string = string>(
  opts: CreateWorkerOptions<TData, TResult, TName>,
): Worker<TData, TResult, TName> {
  const worker = new Worker<TData, TResult, TName>(opts.name, opts.processor, {
    connection: makeRedisClient(`worker-${opts.name}`),
    concurrency: opts.concurrency ?? env.WORKER_CONCURRENCY,
  });

  worker.on('ready', () => logger.info('Worker ready', { queue: opts.name }));
  worker.on('completed', (job, result) => {
    logger.info('Job completed', {
      queue: opts.name,
      jobId: job.id,
      attempts: job.attemptsMade,
      result: typeof result === 'object' ? result : { value: result },
    });
  });
  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      queue: opts.name,
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: err.message,
      stack: err.stack,
    });
  });
  worker.on('error', (err) => {
    logger.error('Worker error', { queue: opts.name, error: err.message });
  });

  workerRegistry.add(worker as Closeable);
  return worker;
}

export function createQueueEvents(name: string): QueueEvents {
  const events = new QueueEvents(name, { connection: makeRedisClient(`events-${name}`) });
  events.on('error', (err) =>
    logger.error('QueueEvents error', { queue: name, error: err.message }),
  );
  eventsRegistry.add(events);
  return events;
}

/* ─────────────────────────────────────────────────────────────────
 * Graceful shutdown
 * ──────────────────────────────────────────────────────────────── */

let shuttingDown = false;

export async function closeQueues(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  if (workerRegistry.size === 0 && eventsRegistry.size === 0 && queueCache.size === 0) {
    // Nothing to do — BullMQ was never initialised.
    shuttingDown = false;
    return;
  }
  logger.info('Shutting down BullMQ workers, queues, and Redis connections…');

  const workerCloses = Array.from(workerRegistry).map(async (w) => {
    try {
      await w.close();
    } catch (err) {
      logger.error('Worker close failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  await Promise.all(workerCloses);

  const eventCloses = Array.from(eventsRegistry).map(async (e) => {
    try {
      await e.close();
    } catch (err) {
      logger.error('QueueEvents close failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  await Promise.all(eventCloses);

  const queueCloses = Array.from(queueCache.values()).map(async (q) => {
    try {
      await q.close();
    } catch (err) {
      logger.error('Queue close failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  await Promise.all(queueCloses);

  const clientCloses = Array.from(clients).map(async (c) => {
    try {
      if (c.status !== 'end') {
        await c.quit();
      }
    } catch (err) {
      logger.error('Redis quit failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
  await Promise.all(clientCloses);

  workerRegistry.clear();
  eventsRegistry.clear();
  queueCache.clear();
  clients.clear();
  cachedProducerConn = undefined;

  logger.info('BullMQ shut down cleanly');
}
