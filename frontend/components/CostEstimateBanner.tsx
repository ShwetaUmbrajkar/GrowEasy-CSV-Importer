"use client";

import { CostEstimate } from "../lib/costEstimate";
import { Coins } from "lucide-react";

interface Props {
  estimate: CostEstimate;
  rowCount: number;
}

export default function CostEstimateBanner({ estimate, rowCount }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
      <Coins className="h-4 w-4 shrink-0 text-brand-500" />
      <span>
        Estimated AI cost for {rowCount} row{rowCount === 1 ? "" : "s"} across {estimate.totalBatches} batch
        {estimate.totalBatches === 1 ? "" : "es"}: <strong>~${estimate.estimatedCostUsd.toFixed(4)}</strong>{" "}
        <span className="text-slate-400">(rough estimate, actual cost depends on field lengths)</span>
      </span>
    </div>
  );
}