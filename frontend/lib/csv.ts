import Papa from "papaparse";
import { RawRow } from "./types";

export interface ClientParsedCsv {
  headers: string[];
  rows: RawRow[];
}

/**
 * Parses a File into rows purely on the client, for the preview step.
 * Per the spec: "No AI processing should happen yet" at this stage -
 * this is pure CSV parsing so the user can sanity-check their file
 * before confirming the import.
 */
export function parseCsvFile(file: File): Promise<ClientParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const rows = (result.data || []).filter(
          (row) => row && Object.values(row).some((v) => v && String(v).trim() !== "")
        );
        resolve({ headers: result.meta.fields || [], rows });
      },
      error: (err) => reject(err),
    });
  });
}
