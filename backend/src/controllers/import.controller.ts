import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";
import { parseCsv } from "../services/csvParser.service";
import { extractBatchWithRetry } from "../services/aiExtractor.service";
import { createJob, getJob, updateJob } from "../services/jobStore.service";
import { Batch, toBatches } from "../utils/batch";
import { RawRow } from "../types/crm.types";
import {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_RETRIES,
} from "../constants/crm";
import { ApiError } from "../middleware/errorHandler";
import { CrmRecord, SkippedRecord } from "../types/crm.types";

/**
 * POST /api/import/start
 * Accepts a CSV file, parses it into rows, kicks off async AI batch
 * extraction, and immediately returns a jobId the client can poll for
 * progress + final results. This is what powers the "progress
 * indicators during AI processing" bonus requirement without needing
 * WebSockets.
 */
export async function startImport(req: Request, res: Response) {
  if (!req.file) {
    throw new ApiError(400, "No CSV file uploaded (field name must be 'file')");
  }

  const fileContent = req.file.buffer.toString("utf-8");
  const { rows } = parseCsv(fileContent);

  if (rows.length === 0) {
    throw new ApiError(400, "CSV file contains no usable rows");
  }

  const batches = toBatches(rows, DEFAULT_BATCH_SIZE);
  const jobId = uuidv4();

  createJob({
    id: jobId,
    status: "processing",
    totalRows: rows.length,
    totalBatches: batches.length,
    batchesCompleted: 0,
    records: [],
    skipped: [],
    createdAt: Date.now(),
  });

  // Fire-and-forget background processing; client polls /status/:jobId.
  processBatchesInBackground(jobId, batches).catch((err) => {
    console.error(`Job ${jobId} failed:`, err);
    updateJob(jobId, { status: "failed", error: (err as Error).message });
  });

  res.status(202).json({
    jobId,
    totalRows: rows.length,
    totalBatches: batches.length,
  });
}

async function processBatchesInBackground(
  jobId: string,
  batches: Batch<RawRow>[]
) {
  const limit = pLimit(DEFAULT_BATCH_CONCURRENCY);
  const allRecords: CrmRecord[] = [];
  const allSkipped: SkippedRecord[] = [];

  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        try {
          const { records, skipped } = await extractBatchWithRetry(
            batch.items,
            batch.startRow,
            DEFAULT_MAX_RETRIES
          );
          allRecords.push(...records);
          allSkipped.push(...skipped);
        } catch (err) {
          // Batch failed after all retries - mark every row in it as
          // skipped rather than losing the whole job.
          batch.items.forEach((row, i) => {
            allSkipped.push({
              row,
              reason: `AI extraction failed after retries: ${(err as Error).message}`,
              rowIndex: batch.startRow + i,
            });
          });
        } finally {
          const job = getJob(jobId);
          if (job) {
            updateJob(jobId, { batchesCompleted: job.batchesCompleted + 1 });
          }
        }
      })
    )
  );

  updateJob(jobId, {
    status: "completed",
    records: allRecords,
    skipped: allSkipped,
  });
}

/**
 * GET /api/import/status/:jobId
 * Polled by the frontend to render a progress bar and, once complete,
 * the final parsed/skipped CRM records.
 */
export function getImportStatus(req: Request, res: Response) {
  const job = getJob(req.params.jobId);
  if (!job) {
    throw new ApiError(404, "Job not found or expired");
  }

  const progress =
    job.totalBatches === 0 ? 100 : Math.round((job.batchesCompleted / job.totalBatches) * 100);

  res.json({
    jobId: job.id,
    status: job.status,
    progress,
    totalRows: job.totalRows,
    totalImported: job.records.length,
    totalSkipped: job.skipped.length,
    records: job.status === "completed" ? job.records : undefined,
    skipped: job.status === "completed" ? job.skipped : undefined,
    error: job.error,
  });
}
