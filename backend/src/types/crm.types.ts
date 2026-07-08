export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number] | "";
export type DataSource = (typeof DATA_SOURCE_VALUES)[number] | "";

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
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface RawRow {
  [key: string]: string;
}

export interface SkippedRecord {
  row: RawRow;
  reason: string;
  rowIndex: number;
}

export interface ExtractionResult {
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

export type JobStatus = "processing" | "completed" | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  totalRows: number;
  totalBatches: number;
  batchesCompleted: number;
  records: CrmRecord[];
  skipped: SkippedRecord[];
  error?: string;
  createdAt: number;
}
