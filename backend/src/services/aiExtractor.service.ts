import OpenAI from "openai";
import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
} from "../constants/crm";
import { CrmRecord, RawRow, SkippedRecord } from "../types/crm.types";
import { withRetry } from "../utils/retry";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * SYSTEM PROMPT
 * ---------------------------------------------------------------
 * This is the single most important piece of prompt engineering in
 * the app. It encodes every business rule from the assignment brief
 * so the model behaves consistently across wildly different CSV
 * shapes (Facebook exports, Google Ads exports, hand-made sheets...).
 *
 * Design choices:
 *  - The model is told to reason about SEMANTIC meaning of columns,
 *    not just name-match ("Ph No", "Contact Number", "Mobile" -> mobile).
 *  - Every hard business rule (allowed enums, skip rule, multi-email
 *    handling) is stated explicitly and unambiguously.
 *  - We ask for structured JSON (enforced separately via response_format)
 *    so there is no free-text preamble to strip.
 */
const SYSTEM_PROMPT = `
You are a data-mapping engine for a CRM called GrowEasy. You will receive an
array of raw CSV rows exported from ARBITRARY sources (Facebook Lead Ads,
Google Ads, Excel sheets, real-estate CRMs, sales reports, marketing agency
sheets, or hand-typed spreadsheets). Column names, order and casing are NOT
standardized and will differ between requests.

Your job: for each row, infer which raw column(s) semantically correspond to
each of these GrowEasy CRM fields, then output the row in that normalized
shape.

TARGET CRM FIELDS:
${CRM_FIELDS.map((f) => `- ${f}`).join("\n")}

FIELD MAPPING RULES:
1. Match columns by MEANING, not just exact name. Examples:
   "Ph No", "Contact", "Mobile Number", "WhatsApp No" -> mobile_without_country_code
   "Full Name", "Lead Name", "Customer" -> name
   "Email Address", "E-mail", "Mail" -> email
   "Lead Source", "Campaign", "Source" -> data_source (only if it confidently
   matches one of the allowed values below, else leave blank)
   "Remarks", "Comments", "Follow Up Notes" -> crm_note
   "Owner", "Assigned To", "Sales Rep" -> lead_owner
2. country_code and mobile_without_country_code must be split apart if a
   single "Phone" column contains a full international number
   (e.g. "+91 9876543210" -> country_code "+91", mobile_without_country_code
   "9876543210"). If no country code is present, guess "+91" ONLY if other
   contextual signals (city/state/country values) strongly suggest India;
   otherwise leave country_code blank.
3. crm_status: choose exactly one of ${CRM_STATUS_VALUES.join(", ")}, or
   "" (empty string) if nothing in the row indicates a clear status. NEVER
   invent a value outside this list.
4. data_source: choose exactly one of ${DATA_SOURCE_VALUES.join(", ")}, or
   "" (empty string) if you are not confident. NEVER invent a value outside
   this list.
5. created_at must be a value parseable by JavaScript's new Date(value)
   (e.g. "2026-05-13 14:20:48" or an ISO 8601 string). If the source has a
   valid-looking date/time column, convert it into this format. If no date
   exists, leave it blank - do not invent a date.
6. crm_note is a catch-all for anything useful that doesn't fit elsewhere:
   general remarks, follow-up notes, extra phone numbers, extra email
   addresses, budget info, project interest, etc. Combine multiple such
   details into one readable note, separated by " | ".
7. MULTIPLE EMAILS: if a row contains more than one email address, use the
   first as email and append the rest into crm_note as
   "Additional email(s): x@y.com, ...".
8. MULTIPLE PHONE NUMBERS: if a row contains more than one phone number, use
   the first as mobile_without_country_code and append the rest into
   crm_note as "Additional number(s): ...".
9. SKIP RULE: if a row has NEITHER a usable email address NOR a usable
   mobile number anywhere in its raw values, you MUST mark it as skipped
   with a short reason (e.g. "No email or mobile number present"). Do not
   guess or fabricate contact info to avoid skipping.
10. Never fabricate data. If a field cannot be confidently determined, leave
    it as an empty string "" rather than guessing.
11. Keep every value a single line (no raw newlines) so the record stays a
    valid single CSV row when exported later. Replace literal newlines
    inside a field with a space or " | ".

OUTPUT FORMAT:
Return one result object per input row, in the SAME ORDER as the input,
using the provided JSON schema. Do not add, remove, merge, or reorder rows.
`.trim();

const responseSchema = {
  type: "json_schema",
  json_schema: {
    name: "crm_extraction_result",
    strict: true,
    schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer" },
              status: { type: "string", enum: ["included", "skipped"] },
              reason: { type: "string" },
              record: {
                type: "object",
                properties: {
                  created_at: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  country_code: { type: "string" },
                  mobile_without_country_code: { type: "string" },
                  company: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  country: { type: "string" },
                  lead_owner: { type: "string" },
                  crm_status: { type: "string" },
                  crm_note: { type: "string" },
                  data_source: { type: "string" },
                  possession_time: { type: "string" },
                  description: { type: "string" },
                },
                required: [
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
                ],
                additionalProperties: false,
              },
            },
            required: ["index", "status", "reason", "record"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    },
  },
} as const;

interface BatchExtractionOutput {
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

/**
 * Sends one batch of raw rows to the LLM and returns normalized CRM
 * records + skipped rows. Wrapped by the caller in withRetry() for
 * resilience against transient failures.
 */
export async function extractBatch(
  rows: RawRow[],
  startRow: number
): Promise<BatchExtractionOutput> {
  const userPayload = rows.map((row, i) => ({ index: i, raw: row }));

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here are ${rows.length} raw CSV rows to map:\n${JSON.stringify(
          userPayload
        )}`,
      },
    ],
    response_format: responseSchema as any,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response for batch");

  const parsed = JSON.parse(content) as {
    results: {
      index: number;
      status: "included" | "skipped";
      reason: string;
      record: CrmRecord;
    }[];
  };

  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  for (const item of parsed.results) {
    const originalRow = rows[item.index];
    if (item.status === "skipped" || !originalRow) {
      skipped.push({
        row: originalRow || {},
        reason: item.reason || "Skipped by AI (no reason given)",
        rowIndex: startRow + item.index,
      });
      continue;
    }
    records.push(sanitizeRecord(item.record));
  }

  return { records, skipped };
}

/** Defensive server-side guardrail: never trust enum values blindly. */
function sanitizeRecord(record: CrmRecord): CrmRecord {
  const safe = { ...record };
  if (!CRM_STATUS_VALUES.includes(safe.crm_status as any)) {
    safe.crm_status = "" as any;
  }
  if (!DATA_SOURCE_VALUES.includes(safe.data_source as any)) {
    safe.data_source = "" as any;
  }
  // Strip stray newlines so the record stays a valid single CSV row.
  for (const key of Object.keys(safe) as (keyof CrmRecord)[]) {
    if (typeof safe[key] === "string") {
      (safe[key] as string) = (safe[key] as string).replace(/\r?\n/g, " \\n ").trim();
    }
  }
  return safe;
}

export async function extractBatchWithRetry(
  rows: RawRow[],
  startRow: number,
  maxRetries: number
): Promise<BatchExtractionOutput> {
  return withRetry(() => extractBatch(rows, startRow), {
    retries: maxRetries,
    onAttemptFail: (attempt, err) =>
      console.warn(
        `Batch starting at row ${startRow} failed attempt ${attempt}:`,
        (err as Error)?.message
      ),
  });
}
