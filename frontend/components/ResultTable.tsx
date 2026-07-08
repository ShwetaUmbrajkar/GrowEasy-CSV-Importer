"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import VirtualizedTable from "./VirtualizedTable";
import { CRM_FIELDS, CrmRecord, SkippedRecord } from "@/lib/types";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  records: CrmRecord[];
  skipped: SkippedRecord[];
  totalRows: number;
}

const STATUS_COLORS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  DID_NOT_CONNECT: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  BAD_LEAD: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  SALE_DONE: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
};

export default function ResultTable({ records, skipped, totalRows }: Props) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  const recordColumns = useMemo<ColumnDef<CrmRecord, any>[]>(
    () =>
      CRM_FIELDS.map((field) => ({
        accessorKey: field,
        header: field,
        cell: (info) => {
          const value = info.getValue();
          if (field === "crm_status" && value) {
            return (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  STATUS_COLORS[value as string] || "bg-slate-100 text-slate-600"
                }`}
              >
                {value}
              </span>
            );
          }
          return value ? (
            String(value)
          ) : (
            <span className="text-slate-300 dark:text-slate-600">&mdash;</span>
          );
        },
      })),
    []
  );

  const skippedColumns = useMemo<ColumnDef<SkippedRecord, any>[]>(
    () => [
      { accessorKey: "rowIndex", header: "Row #", cell: (info) => info.getValue<number>() + 1 },
      { accessorKey: "reason", header: "Reason skipped" },
      {
        id: "raw",
        header: "Raw row data",
        cell: (info) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {JSON.stringify(info.row.original.row)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard label="Total rows" value={totalRows} />
        <SummaryCard
          label="Imported"
          value={records.length}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        />
        <SummaryCard
          label="Skipped"
          value={skipped.length}
          icon={<XCircle className="h-4 w-4 text-red-500" />}
        />
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <TabButton active={tab === "imported"} onClick={() => setTab("imported")}>
          Imported ({records.length})
        </TabButton>
        <TabButton active={tab === "skipped"} onClick={() => setTab("skipped")}>
          Skipped ({skipped.length})
        </TabButton>
      </div>

      {tab === "imported" ? (
        records.length > 0 ? (
          <VirtualizedTable columns={recordColumns} data={records} />
        ) : (
          <EmptyState text="No records were successfully imported." />
        )
      ) : skipped.length > 0 ? (
        <VirtualizedTable columns={skippedColumns} data={skipped} />
      ) : (
        <EmptyState text="Nothing was skipped &mdash; every row had an email or mobile number." />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
      {text}
    </div>
  );
}
