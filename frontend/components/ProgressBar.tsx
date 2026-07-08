"use client";

import { Loader2 } from "lucide-react";

interface Props {
  progress: number;
  totalRows: number;
}

export default function ProgressBar({ progress, totalRows }: Props) {
  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
      <div className="flex justify-center mb-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
      <p className="text-base font-medium text-slate-800 dark:text-slate-100">
        AI is extracting CRM fields from {totalRows} row{totalRows === 1 ? "" : "s"}&hellip;
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Processing in batches for accuracy &mdash; this usually takes a few seconds.
      </p>

      <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{progress}%</p>
    </div>
  );
}
