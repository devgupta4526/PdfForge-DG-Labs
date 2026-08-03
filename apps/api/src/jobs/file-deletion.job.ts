/**
 * file-deletion job — removes a generated file (from whichever storage driver
 * is active) after a delay (default 1h) and clears the corresponding
 * `operations` row's output URL.
 *
 * The job's *behaviour* is backend-agnostic: it's expressed as a pure async
 * function `executeFileDeletion(data, ctx)` that the BullMQ worker AND the
 * in-memory scheduler both invoke. That way the deletion logic has a single
 * source of truth regardless of how the work was scheduled.
 *
 * Idempotency: deleting an already-absent object returns `false` (not an
 * error), and `clearOperationOutput` is a `set ... where id = ?` — repeat
 * runs converge on the same DB state.
 */

import { clearOperationOutput, getOperationById } from '@pdf-forge/shared/db';
import { logger } from '../lib/logger.js';
import { StorageError, deleteFile } from '../storage/index.js';

export const FILE_DELETION_QUEUE = 'file-deletion' as const;
export type FileDeletionQueueName = typeof FILE_DELETION_QUEUE;

export interface FileDeletionJobData {
  /**
   * Storage key to delete. Named `r2Key` for backwards compatibility, but
   * applies equally to the local driver (or any future backend).
   */
  r2Key: string;
  operationId: string;
}

export interface FileDeletionJobResult {
  r2Key: string;
  operationId: string;
  /** true when the storage object was actually removed; false when already gone. */
  deleted: boolean;
  operationCleared: boolean;
}

export interface FileDeletionContext {
  jobId: string;
  attempt: number;
}

/**
 * Backend-agnostic executor. Throw to signal "retry me" — both backends
 * implement exponential backoff with bounded attempts.
 */
export async function executeFileDeletion(
  data: FileDeletionJobData,
  ctx: FileDeletionContext,
): Promise<FileDeletionJobResult> {
  const { r2Key, operationId } = data;
  const startedAt = Date.now();

  logger.info('File deletion processing', {
    jobId: ctx.jobId,
    attempt: ctx.attempt,
    r2Key,
    operationId,
  });

  if (!r2Key || !operationId) {
    throw new Error(
      `Invalid job payload: r2Key=${String(r2Key)} operationId=${String(operationId)}`,
    );
  }

  const operation = await getOperationById(operationId).catch((err: unknown) => {
    logger.warn('File deletion: failed to load operation row, continuing anyway', {
      operationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });
  if (!operation) {
    logger.warn('File deletion: operation row not found', { operationId, r2Key });
  } else if (operation.outputFileUrl && !operation.outputFileUrl.includes(r2Key)) {
    logger.warn('File deletion: r2Key does not match operation output URL', {
      operationId,
      r2Key,
      outputFileUrl: operation.outputFileUrl,
    });
  }

  let deleted = false;
  try {
    deleted = await deleteFile(r2Key);
  } catch (err) {
    if (err instanceof StorageError) {
      logger.error('File deletion: storage delete failed (will retry)', {
        jobId: ctx.jobId,
        r2Key,
        operationId,
        code: err.code,
        message: err.message,
      });
    }
    throw err;
  }

  // Bookkeeping is best-effort: the file is the source of truth, the DB row
  // is metadata. If the DB is unreachable (e.g. local dev with no Postgres)
  // or if the operation row never existed in the first place (synthetic
  // deletions scheduled directly by tool routes), we log and move on rather
  // than retrying forever.
  let operationCleared = false;
  try {
    await clearOperationOutput(operationId);
    operationCleared = true;
  } catch (err) {
    logger.warn('File deletion: failed to clear operation output (continuing)', {
      jobId: ctx.jobId,
      operationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const elapsed = Date.now() - startedAt;
  logger.info('File deletion processed', {
    jobId: ctx.jobId,
    r2Key,
    operationId,
    deleted,
    operationCleared,
    elapsedMs: elapsed,
  });

  return { r2Key, operationId, deleted, operationCleared };
}
