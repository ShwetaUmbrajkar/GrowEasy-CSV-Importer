"use client";

import { useCallback, useRef, useState } from "react";
import { parseCsvFile } from "@/lib/csv";
import { pollImportStatus, startImport } from "@/lib/api";
import { CrmRecord, RawRow, SkippedRecord } from "@/lib/types";

export type ImportStage =
  | "idle"
  | "preview"
  | "uploading"
  | "processing"
  | "completed"
  | "error";

export interface CsvImportState {
  stage: ImportStage;
  fileName: string | null;
  headers: string[];
  previewRows: RawRow[];
  progress: number;
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  records: CrmRecord[];
  skipped: SkippedRecord[];
  errorMessage: string | null;
}

const initialState: CsvImportState = {
  stage: "idle",
  fileName: null,
  headers: [],
  previewRows: [],
  progress: 0,
  totalRows: 0,
  totalImported: 0,
  totalSkipped: 0,
  records: [],
  skipped: [],
  errorMessage: null,
};

export function useCsvImport() {
  const [state, setState] = useState<CsvImportState>(initialState);
  const fileRef = useRef<File | null>(null);
  const stopPollingRef = useRef<() => void>();

  const onFileSelected = useCallback(async (file: File) => {
    try {
      fileRef.current = file;
      const { headers, rows } = await parseCsvFile(file);

      if (rows.length === 0) {
        setState({
          ...initialState,
          stage: "error",
          errorMessage: "This CSV appears to be empty or unreadable.",
        });
        return;
      }

      setState({
        ...initialState,
        stage: "preview",
        fileName: file.name,
        headers,
        previewRows: rows,
        totalRows: rows.length,
      });
    } catch (err) {
      setState({
        ...initialState,
        stage: "error",
        errorMessage: (err as Error).message || "Failed to parse CSV file.",
      });
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!fileRef.current) return;

    setState((prev) => ({ ...prev, stage: "uploading", errorMessage: null }));

    try {
      const { jobId } = await startImport(fileRef.current);
      setState((prev) => ({ ...prev, stage: "processing", progress: 0 }));

      stopPollingRef.current = pollImportStatus(jobId, (status) => {
        if (status.status === "failed") {
          setState((prev) => ({
            ...prev,
            stage: "error",
            errorMessage: status.error || "AI extraction failed.",
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          progress: status.progress,
          totalImported: status.totalImported,
          totalSkipped: status.totalSkipped,
          ...(status.status === "completed"
            ? {
                stage: "completed",
                records: status.records || [],
                skipped: status.skipped || [],
              }
            : {}),
        }));
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        stage: "error",
        errorMessage: (err as Error).message || "Failed to start import.",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    stopPollingRef.current?.();
    fileRef.current = null;
    setState(initialState);
  }, []);

  return { state, onFileSelected, confirmImport, reset };
}
