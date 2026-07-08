# GrowEasy CSV Importer

An AI-powered CSV importer that turns **any** CSV export — Facebook Lead Ads,
Google Ads, real-estate CRMs, hand-made spreadsheets, whatever — into clean,
normalized GrowEasy CRM lead records, regardless of column names or layout.

**Live demo:** _add your deployed URL here_
**Loom / video walkthrough:** _optional, add here_

---

## How it works (end-to-end flow)

1. **Upload** — drag & drop or pick any `.csv` file (frontend).
2. **Preview** — the file is parsed *entirely client-side* with PapaParse and
   shown in a sticky-header, virtualized, scrollable table. **No AI call
   happens at this stage**, exactly as required.
3. **Confirm** — clicking "Confirm & Import with AI" uploads the raw file to
   the backend.
4. **AI extraction** — the backend re-parses the CSV, splits rows into
   batches, and sends each batch to an LLM with a strict system prompt +
   JSON schema that maps arbitrary columns into the 15 GrowEasy CRM fields.
5. **Result** — the frontend polls a status endpoint for progress, then
   renders the imported records and any skipped rows (with reasons) in a
   second table, along with total imported / skipped counts.

```
┌────────────┐   parse (client)   ┌────────────┐  POST /api/import/start  ┌────────────────┐
│  Upload UI │ ─────────────────► │ Preview UI │ ────────────────────────►│ Express backend │
└────────────┘                    └────────────┘                          └────────┬────────┘
                                                                                     │ batches rows
                                                                          poll ┌─────▼─────┐
                                        Result UI  ◄───────────────────────── │ LLM (batch │
                                                    GET /api/import/status/:id│ extraction)│
                                                                               └───────────┘
```

---

## Tech stack

| Layer     | Choice                                                                 |
|-----------|-------------------------------------------------------------------------|
| Frontend  | Next.js 14 (App Router) + TypeScript + Tailwind CSS                    |
| Tables    | TanStack Table + TanStack Virtual (row virtualization)                 |
| Uploads   | react-dropzone                                                         |
| Backend   | Node.js + Express + TypeScript                                        |
| AI        | OpenAI (`gpt-4o-mini`) with structured JSON-schema output, temp=0      |
| Batching  | `p-limit` for controlled concurrency                                   |
| Testing   | Jest + ts-jest                                                        |
| Deploy    | Docker + docker-compose; Vercel (frontend) / Render or Railway (backend) |

---

## Project structure

```
groweasy-csv-importer/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── index.ts                     # Express app entry
│   │   ├── constants/crm.ts             # CRM fields, allowed enum values
│   │   ├── types/crm.types.ts           # Shared TS types
│   │   ├── middleware/
│   │   │   ├── upload.ts                # multer CSV upload config
│   │   │   └── errorHandler.ts          # centralized error handling
│   │   ├── services/
│   │   │   ├── csvParser.service.ts     # column-agnostic CSV -> rows
│   │   │   ├── aiExtractor.service.ts   # ★ prompt engineering + LLM call
│   │   │   └── jobStore.service.ts      # in-memory job/progress store
│   │   ├── controllers/import.controller.ts  # orchestrates batching + polling
│   │   ├── routes/import.routes.ts
│   │   └── utils/
│   │       ├── batch.ts                 # chunk rows into batches
│   │       └── retry.ts                 # exponential backoff retry
│   ├── tests/                           # Jest unit tests
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── layout.tsx / providers.tsx / globals.css
    │   └── page.tsx                     # 4-step flow orchestration
    ├── components/
    │   ├── CsvUploader.tsx              # drag & drop
    │   ├── CsvPreviewTable.tsx          # step 2 (raw preview)
    │   ├── ResultTable.tsx              # step 4 (imported + skipped tabs)
    │   ├── VirtualizedTable.tsx         # shared sticky/virtualized table
    │   ├── ProgressBar.tsx              # AI processing progress
    │   └── ThemeToggle.tsx              # dark mode
    ├── hooks/useCsvImport.ts            # client-side state machine
    ├── lib/{api.ts,csv.ts,types.ts}
    ├── Dockerfile
    └── .env.example
```

---

## Setup instructions

### 0. Prerequisites
- Node.js 18+ and npm
- An OpenAI API key ([platform.openai.com](https://platform.openai.com)) — or
  swap in Gemini/Claude (see [Swapping the AI provider](#swapping-the-ai-provider))

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env and paste your OPENAI_API_KEY
npm run dev
```

Backend runs on **http://localhost:8080**. Check it's alive:

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
# NEXT_PUBLIC_API_URL should point at the backend above
npm run dev
```

Frontend runs on **http://localhost:3000** — open it in your browser and
upload a CSV.

### 3. Run backend tests

```bash
cd backend
npm test
```

### 4. Run with Docker (both services at once)

```bash
export OPENAI_API_KEY=sk-xxxxxxxx
docker compose up --build
```

Frontend: http://localhost:3000 · Backend: http://localhost:8080

---

## API reference

### `POST /api/import/start`
Multipart form upload, field name `file`. Kicks off async AI extraction and
returns a job id immediately.

```bash
curl -X POST http://localhost:8080/api/import/start \
  -F "file=@sample_leads.csv"
```
```json
{ "jobId": "b3f1...", "totalRows": 42, "totalBatches": 3 }
```

### `GET /api/import/status/:jobId`
Poll this for progress; once `status` is `"completed"`, `records` and
`skipped` are populated.

```bash
curl http://localhost:8080/api/import/status/b3f1...
```
```json
{
  "jobId": "b3f1...",
  "status": "completed",
  "progress": 100,
  "totalRows": 42,
  "totalImported": 39,
  "totalSkipped": 3,
  "records": [ { "created_at": "...", "name": "...", "...": "..." } ],
  "skipped": [ { "row": {...}, "reason": "No email or mobile number present", "rowIndex": 7 } ]
}
```

Import both endpoints into **Postman** as a quick sanity check before wiring
up the frontend.

---

## AI prompt engineering (the core of this assignment)

`backend/src/services/aiExtractor.service.ts` is where the actual field
mapping intelligence lives. Key design decisions:

- **Semantic column matching**, not name matching — the system prompt
  explicitly tells the model to reason about what a column *means*
  ("Ph No" / "Contact Number" / "WhatsApp No" all → `mobile_without_country_code`),
  which is why differently-shaped CSVs (Facebook exports, Google Ads exports,
  hand-typed sheets) all work without any per-source code.
- **Strict JSON-schema structured output** (`response_format: json_schema`,
  `strict: true`) — the model cannot return malformed JSON or invent
  extra fields; every response is programmatically parseable.
- **`temperature: 0`** for consistent, repeatable extraction.
- **Every business rule from the brief is encoded explicitly**: the 4 allowed
  `crm_status` values, the 5 allowed `data_source` values, the
  multi-email/multi-phone → `crm_note` merging rule, the date-format rule,
  and the skip-if-no-contact-info rule.
- **Server-side guardrails** (`sanitizeRecord` in the same file) never trust
  the AI blindly — any `crm_status`/`data_source` outside the allowed enum
  is force-blanked, and stray newlines are stripped so every record stays a
  valid single CSV row.
- **Batching + bounded concurrency** (`BATCH_SIZE=15`, `BATCH_CONCURRENCY=3`)
  keeps prompts small (better accuracy, lower latency) while still
  processing large files quickly.
- **Retry with exponential backoff** (`utils/retry.ts`) — a batch that fails
  (rate limit, network blip) is retried up to `MAX_RETRIES` times before its
  rows are marked skipped, so one bad batch never kills the whole import.

## Swapping the AI provider

The assignment allows OpenAI, Gemini, or Claude. The extraction service is
intentionally isolated in one file (`aiExtractor.service.ts`) with one
exported function, `extractBatch`, so swapping providers means rewriting the
inside of that one function without touching batching, retries, controllers,
or the frontend at all. For Anthropic Claude, replace the OpenAI client call
with `anthropic.messages.create(...)` using a tool-use block whose input
schema matches `responseSchema` above.

---

## Bonus features implemented

- [x] Drag & drop upload (`react-dropzone`)
- [x] Progress indicators during AI processing (polling-based progress bar)
- [x] Incremental processing — batches complete independently and the
      progress bar reflects `batchesCompleted / totalBatches` in real time
- [x] Retry mechanism for failed AI batches (exponential backoff, configurable)
- [x] Virtualized table for large CSVs (`@tanstack/react-virtual`, handles
      tens of thousands of rows smoothly)
- [x] Dark mode (`next-themes`, toggle in header)
- [x] Unit tests (Jest, CSV parsing + batching logic)
- [x] Docker setup for both services + `docker-compose.yml`
- [x] Well-written README with setup instructions (this file)
- [ ] Deployment — see below, deploy before submitting

## What I'd add with more time (beyond the brief)

- **Field-level confidence scores** from the AI, shown as a subtle indicator
  in the result table so a human reviewer knows which mappings to double-check.
- **Editable result table** — let the user correct a misclassified field
  before the final "Import to CRM" commit, rather than only viewing results.
- **Column-mapping memory** — remember confirmed mappings per CSV source
  (e.g. "Facebook Lead Ads") so repeat imports from the same source skip
  the AI call entirely and just reuse the saved mapping (cheaper + faster).
- **Streaming results via Server-Sent Events / WebSockets** instead of
  polling, so results appear incrementally per-batch rather than all at once.
- **Persist jobs in Redis/Postgres** instead of in-memory, so imports survive
  a backend restart and can scale across multiple instances.
- **Deduplication** against existing CRM leads by email/phone before import.
- **CSV export** of the final result table (already-normalized CRM format)
  as a download button.
- **Rate-limit / cost guard** — a max-rows-per-upload limit and a live
  estimated-cost display before confirming, since AI extraction has a
  per-token cost.

---

## Deployment

**Frontend (Vercel):**
```bash
cd frontend
vercel deploy --prod
# Set NEXT_PUBLIC_API_URL to your deployed backend URL in Vercel's env settings
```

**Backend (Render/Railway):**
- New Web Service → point at `backend/` with `Dockerfile` detected automatically
- Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `CORS_ORIGIN` (your Vercel URL) as
  environment variables

---

## Position applied for

Intern — AI Engineer

## Submission

Public repo + live URLs to be emailed to **varun@groweasy.ai** along with this
README and position applied for, as requested in the assignment brief.
