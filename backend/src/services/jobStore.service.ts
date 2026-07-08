import { Job } from "../types/crm.types";

/**
 * Simple in-memory job store. Good enough for a stateless demo/assignment.
 * Swap for Redis if you need multi-instance horizontal scaling in prod.
 */
const jobs = new Map<string, Job>();

const JOB_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createJob(job: Job) {
  jobs.set(job.id, job);
  cleanupOldJobs();
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>) {
  const existing = jobs.get(id);
  if (!existing) return;
  jobs.set(id, { ...existing, ...patch });
}

function cleanupOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}
