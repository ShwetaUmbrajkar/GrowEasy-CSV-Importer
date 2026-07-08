"use client";

import { AlertTriangle, ArrowLeft, FileSpreadsheet, RotateCcw } from "lucide-react";
import CsvUploader from "@/components/CsvUploader";
import CsvPreviewTable from "@/components/CsvPreviewTable";
import ResultTable from "@/components/ResultTable";
import ProgressBar from "@/components/ProgressBar";
import ThemeToggle from "@/components/ThemeToggle";
import { useCsvImport } from "@/hooks/useCsvImport";

const STEPS = ["Upload", "Preview", "Confirm", "Result"];

export default function Home() {
  const { state, onFileSelected, confirmImport, reset } = useCsvImport();

  const stepIndex =
    state.stage === "idle" || state.stage === "error"
      ? 0
      : state.stage === "preview"
      ? 1
      : state.stage === "uploading" || state.stage === "processing"
      ? 2
      : 3;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white font-bold">
            G
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">GrowEasy CSV Importer</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI-powered lead import from any CSV layout
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <StepIndicator current={stepIndex} />

      <section className="mt-8">
        {state.stage === "idle" && <CsvUploader onFileSelected={onFileSelected} />}

        {state.stage === "error" && (
          <ErrorPanel message={state.errorMessage} onRetry={reset} />
        )}

        {state.stage === "preview" && (
          <div className="space-y-5">
            <FileBanner fileName={state.fileName} rowCount={state.totalRows} onReset={reset} />
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Preview &mdash; {state.totalRows} row{state.totalRows === 1 ? "" : "s"} detected
                (no AI processing yet)
              </h2>
              <CsvPreviewTable headers={state.headers} rows={state.previewRows} />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={reset}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Confirm &amp; Import with AI
              </button>
            </div>
          </div>
        )}

        {(state.stage === "uploading" || state.stage === "processing") && (
          <ProgressBar progress={state.stage === "uploading" ? 5 : state.progress} totalRows={state.totalRows} />
        )}

        {state.stage === "completed" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Import complete
              </h2>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Import another file
              </button>
            </div>
            <ResultTable records={state.records} skipped={state.skipped} totalRows={state.totalRows} />
          </div>
        )}
      </section>
    </main>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm">
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
              i <= current
                ? "bg-brand-500 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            }`}
          >
            {i + 1}
          </div>
          <span className={i <= current ? "text-slate-800 dark:text-slate-100 font-medium" : "text-slate-400"}>
            {step}
          </span>
          {i < STEPS.length - 1 && <div className="h-px w-6 sm:w-10 bg-slate-200 dark:bg-slate-800" />}
        </li>
      ))}
    </ol>
  );
}

function FileBanner({
  fileName,
  rowCount,
  onReset,
}: {
  fileName: string | null;
  rowCount: number;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-5 w-5 text-brand-500" />
        <div>
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{rowCount} rows parsed</p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Choose a different file
      </button>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-500/10 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <p className="font-medium text-red-700 dark:text-red-300">Something went wrong</p>
      <p className="max-w-md text-sm text-red-600/90 dark:text-red-300/80">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
      >
        Try again
      </button>
    </div>
  );
}
