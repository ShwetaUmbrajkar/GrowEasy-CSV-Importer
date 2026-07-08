export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  row: Record<string, string>;
  reason: string;
  rowIndex: number;
}

export interface RawRow {
  [key: string]: string;
}

export type JobStatus = "processing" | "completed" | "failed";

export interface ImportStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  records?: CrmRecord[];
  skipped?: SkippedRecord[];
  error?: string;
}

export interface StartImportResponse {
  jobId: string;
  totalRows: number;
  totalBatches: number;
}
