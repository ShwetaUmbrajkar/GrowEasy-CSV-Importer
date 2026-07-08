import { ImportStatusResponse, StartImportResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function startImport(file: File): Promise<StartImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/import/start`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Import failed to start (${res.status})`);
  }

  return res.json();
}

export async function getImportStatus(jobId: string): Promise<ImportStatusResponse> {
  const res = await fetch(`${API_URL}/api/import/status/${jobId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch job status (${res.status})`);
  }
  return res.json();
}

/**
 * Polls the job status endpoint until the job completes or fails,
 * invoking onProgress on every tick. This is what drives the
 * "progress indicator during AI processing" bonus feature.
 */
export function pollImportStatus(
  jobId: string,
  onProgress: (status: ImportStatusResponse) => void,
  intervalMs = 1200
): () => void {
  let cancelled = false;

  const tick = async () => {
    if (cancelled) return;
    try {
      const status = await getImportStatus(jobId);
      onProgress(status);
      if (status.status === "processing" && !cancelled) {
        setTimeout(tick, intervalMs);
      }
    } catch (err) {
      if (!cancelled) {
        onProgress({
          jobId,
          status: "failed",
          progress: 0,
          totalRows: 0,
          totalImported: 0,
          totalSkipped: 0,
          error: (err as Error).message,
        });
      }
    }
  };

  tick();

  return () => {
    cancelled = true;
  };
}
