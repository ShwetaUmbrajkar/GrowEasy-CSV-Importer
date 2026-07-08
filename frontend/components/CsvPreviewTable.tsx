"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import VirtualizedTable from "./VirtualizedTable";
import { RawRow } from "@/lib/types";

interface Props {
  headers: string[];
  rows: RawRow[];
}

export default function CsvPreviewTable({ headers, rows }: Props) {
  const columns = useMemo<ColumnDef<RawRow, any>[]>(
    () =>
      headers.map((header) => ({
        accessorKey: header,
        header,
        cell: (info) => {
          const value = info.getValue();
          return value ? String(value) : <span className="text-slate-300 dark:text-slate-600">&mdash;</span>;
        },
      })),
    [headers]
  );

  return <VirtualizedTable columns={columns} data={rows} />;
}
