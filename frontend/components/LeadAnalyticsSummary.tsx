"use client";

import { useMemo } from "react";
import { CrmRecord } from "@/lib/types";
import { BarChart3 } from "lucide-react";

interface Props {
  records: CrmRecord[];
}

const STATUS_BAR_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-500",
  DID_NOT_CONNECT: "bg-amber-500",
  BAD_LEAD: "bg-red-500",
  SALE_DONE: "bg-blue-500",
};

function tally(records: CrmRecord[], field: keyof CrmRecord, includeBlank = false) {
  const counts = new Map<string, number>();
  for (const r of records) {
    const value = (r[field] as string) || (includeBlank ? "Unclassified" : "");
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * A quick "at a glance" breakdown of the imported batch - lead status mix
 * and top sources - the kind of pipeline snapshot GrowEasy's own dashboard
 * shows. Pure derived UI, no extra chart library: a few CSS bars are all
 * this needs and it keeps the bundle light.
 */
export default function LeadAnalyticsSummary({ records }: Props) {
  const statusCounts = useMemo(() => tally(records, "crm_status", true), [records]);
  const sourceCounts = useMemo(() => tally(records, "data_source"), [records]);

  if (records.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <BreakdownCard
        title="Leads by status"
        rows={statusCounts}
        total={records.length}
        colorFor={(label) => STATUS_BAR_COLORS[label] || "bg-slate-400"}
      />
      <BreakdownCard
        title="Leads by source"
        rows={sourceCounts.length > 0 ? sourceCounts : [["No source detected", records.length]]}
        total={records.length}
        colorFor={() => "bg-brand-500"}
      />
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  total,
  colorFor,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  colorFor: (label: string) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <BarChart3 className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-2">
        {rows.slice(0, 5).map(([label, count]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-slate-600 dark:text-slate-300" title={label}>
              {label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${colorFor(label)}`}
                style={{ width: `${Math.max(4, (count / total) * 100)}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-slate-500 dark:text-slate-400">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}