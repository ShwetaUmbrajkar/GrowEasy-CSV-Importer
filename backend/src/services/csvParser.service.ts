import Papa from "papaparse";
import { RawRow } from "../types/crm.types";

export interface ParsedCsv {
  rows: RawRow[];
  headers: string[];
}

/**
 * Parses a raw CSV string/buffer into an array of row objects.
 * We deliberately do NOT assume fixed column names - whatever headers
 * exist in the file become the object keys, and the AI layer figures
 * out the mapping later. This keeps the parser fully format-agnostic.
 */
export function parseCsv(fileContent: string): ParsedCsv {
  const result = Papa.parse<RawRow>(fileContent, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  if (result.errors && result.errors.length > 0) {
    // PapaParse reports row-level errors (e.g. inconsistent column counts)
    // but usually still returns usable data, so we log and continue
    // rather than hard-failing the whole import.
    console.warn(
      `CSV parse warnings (${result.errors.length}):`,
      result.errors.slice(0, 5)
    );
  }

  const rows = (result.data || []).filter(
    (row) => row && Object.values(row).some((v) => v && String(v).trim() !== "")
  );

  const headers = result.meta.fields || [];

  return { rows, headers };
}
