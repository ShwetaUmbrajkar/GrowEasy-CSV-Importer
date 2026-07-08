"use client";

import { useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

interface Props<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  maxHeight?: string;
}

/**
 * Sticky-header, horizontally + vertically scrollable, ROW-VIRTUALIZED
 * table. Row virtualization is what lets this comfortably render CSVs
 * with tens of thousands of rows without the DOM (and the browser)
 * grinding to a halt - only the visible rows are ever mounted.
 */
export default function VirtualizedTable<T>({ columns, data, maxHeight = "480px" }: Props<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div
      ref={scrollRef}
      style={{ maxHeight }}
      className="relative w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"
    >
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-200"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} colSpan={columns.length} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                className="border-t border-slate-100 dark:border-slate-800 even:bg-slate-50/50 dark:even:bg-slate-800/30 hover:bg-brand-50/60 dark:hover:bg-brand-500/10"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
