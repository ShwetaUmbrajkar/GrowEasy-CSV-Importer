import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../types/crm.types";

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

export const EMPTY_CRM_RECORD = CRM_FIELDS.reduce((acc, field) => {
  acc[field] = "";
  return acc;
}, {} as Record<(typeof CRM_FIELDS)[number], string>);

export { CRM_STATUS_VALUES, DATA_SOURCE_VALUES };

export const DEFAULT_BATCH_SIZE = Number(process.env.BATCH_SIZE || 15);
export const DEFAULT_BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY || 3);
export const DEFAULT_MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
