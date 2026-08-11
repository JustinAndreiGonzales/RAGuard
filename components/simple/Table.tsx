import { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  align?: "left" | "right";
  render?: (value: T[keyof T], row: T) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
}

type TableRowProps<T> = {
  isSelected?: boolean;
  row: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
};

const Table = <T,>({ columns, data, keyField, onRowClick }: TableProps<T>) => {
  return (
    <div className="rounded-lg bg-surface border border-line overflow-hidden">
      <table className="w-full border-collapse type-body">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-md py-sm border-b border-b-line type-caption text-tertiary uppercase",
                  col.align === "right" ? "text-right" : "text-left",
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <TableRow
              key={String(row[keyField])}
              row={row}
              columns={columns}
              onRowClick={onRowClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TableRow = <T,>({
  isSelected = false,
  row,
  columns,
  onRowClick,
}: TableRowProps<T>) => {
  return (
    <tr
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn(
        "border-b border-b-line-subtle last:border-b-0",
        onRowClick && "cursor-pointer",
        "transition-colors hover:bg-canvas hover:shadow-sm",
        isSelected && "bg-accent-subtle-bg",
      )}
    >
      {columns.map((col) => {
        const value = row[col.key];
        return (
          <td
            key={col.key}
            className={cn(
              "px-md",
              col.align === "right" ? "text-right" : "text-left",
            )}
          >
            <div
              className={cn(
                "min-h-[56px] flex items-center",
                col.align === "right" ? "justify-end" : "justify-start",
              )}
            >
              {col.render ? col.render(value, row) : (value as ReactNode)}
            </div>
          </td>
        );
      })}
    </tr>
  );
};

export default Table;
