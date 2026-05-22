"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ColumnSpec, EntityConfig } from "@/lib/library/config";
import {
  LIBRARY_ANSWER_TYPE_LABEL,
  LIBRARY_INTERPRETATION_LABEL,
  LIBRARY_RECOMMENDATION_TYPE_LABEL,
  LIBRARY_STATUS_LABEL,
} from "@/lib/library/config";
import type { LibraryCatalogItem, LibraryItemStatus } from "@/lib/library/types";
import type { LibraryTransition } from "@/lib/library/client";
import { formSurface } from "@/lib/form-surface";
import { LifecycleMenu } from "./lifecycle-menu";

export type EntityTableProps = {
  config: EntityConfig;
  items: LibraryCatalogItem[];
  onEdit: (item: LibraryCatalogItem) => void;
  onDelete: (item: LibraryCatalogItem) => void;
  onTransition: (
    item: LibraryCatalogItem,
    action: LibraryTransition,
    payload: { justification?: string | null },
  ) => Promise<void>;
  disabled?: boolean;
};

const STATUS_BADGE: Record<
  LibraryItemStatus,
  keyof typeof formSurface.badge
> = {
  draft: "neutral",
  in_review: "warning",
  published: "success",
  deprecated: "danger",
  archived: "neutral",
};

function renderCell(column: ColumnSpec, item: LibraryCatalogItem): React.ReactNode {
  const raw = (item as unknown as Record<string, unknown>)[column.key];
  if (column.key === "status" && typeof raw === "string") {
    const status = raw as LibraryItemStatus;
    const variant = STATUS_BADGE[status] ?? "neutral";
    return (
      <span className={`${formSurface.badge.base} ${formSurface.badge[variant]}`}>
        {LIBRARY_STATUS_LABEL[status] ?? status}
      </span>
    );
  }
  if (column.key === "tags" && Array.isArray(raw)) {
    if ((raw as string[]).length === 0) return "—";
    return (
      <span className="flex flex-wrap gap-1">
        {(raw as string[]).map((tag) => (
          <span
            key={tag}
            className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}
          >
            {tag}
          </span>
        ))}
      </span>
    );
  }
  if (raw === null || raw === undefined || raw === "") return "—";
  if (column.key === "answerType") {
    return LIBRARY_ANSWER_TYPE_LABEL[raw as keyof typeof LIBRARY_ANSWER_TYPE_LABEL] ?? String(raw);
  }
  if (column.key === "interpretation") {
    return (
      LIBRARY_INTERPRETATION_LABEL[raw as keyof typeof LIBRARY_INTERPRETATION_LABEL] ?? String(raw)
    );
  }
  if (column.key === "tipo") {
    return (
      LIBRARY_RECOMMENDATION_TYPE_LABEL[
        raw as keyof typeof LIBRARY_RECOMMENDATION_TYPE_LABEL
      ] ?? String(raw)
    );
  }
  if (column.key === "name" || column.key === "title") {
    return <span className="font-medium text-slate-900">{String(raw)}</span>;
  }
  if (column.key === "description") {
    return (
      <span className="line-clamp-2 max-w-md text-slate-600" title={String(raw)}>
        {String(raw)}
      </span>
    );
  }
  if (typeof raw === "number") return <span className="tabular-nums">{String(raw)}</span>;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.join(", ");
  return String(raw);
}

export function EntityTable({
  config,
  items,
  onEdit,
  onDelete,
  onTransition,
  disabled,
}: EntityTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 px-4 py-10 text-center text-sm text-slate-600">
        {config.emptyLabel}
      </div>
    );
  }

  return (
    <div className={formSurface.table.wrapper}>
      <table className={`${formSurface.table.table} min-w-[920px]`}>
        <thead className={formSurface.table.head}>
          <tr>
            {config.columns.map((column) => (
              <th
                key={column.key}
                className={`${formSurface.table.headCell} py-3 ${column.width ?? ""} ${
                  column.align === "right" ? "text-right" : ""
                }`}
              >
                {column.label}
              </th>
            ))}
            <th className={`${formSurface.table.headCell} w-24 py-3`}>Fluxo</th>
            <th className={`${formSurface.table.headCell} w-28 py-3 text-right`}>Ações</th>
          </tr>
        </thead>
        <tbody className={formSurface.table.body}>
          {items.map((item) => (
            <tr key={item.id} className={formSurface.table.row}>
              {config.columns.map((column) => (
                <td
                  key={column.key}
                  className={`${
                    column.key === "code" || column.key === "axisCode"
                      ? formSurface.table.cellMuted
                      : formSurface.table.cell
                  } align-middle ${
                    column.align === "right" ? "text-right" : ""
                  }`}
                >
                  {renderCell(column, item)}
                </td>
              ))}
              <td className={`${formSurface.table.cell} align-middle`}>
                <LifecycleMenu
                  status={item.status}
                  disabled={disabled}
                  onRun={(action, payload) => onTransition(item, action, payload)}
                />
              </td>
              <td className={`${formSurface.table.cell} align-middle text-right`}>
                <div className="inline-flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    disabled={disabled}
                    className={`${formSurface.ghostButton} h-8 w-8 px-0`}
                    aria-label={`Editar ${config.singular}`}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <details className="relative">
                    <summary
                      className={`${formSurface.ghostButton} h-8 w-8 cursor-pointer list-none px-0 [&::-webkit-details-marker]:hidden`}
                      aria-label="Mais ações"
                      title="Mais ações"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </summary>
                    <div
                      className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-lg border border-slate-200 bg-white py-1 text-left text-sm shadow-lg"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        onClick={() => onDelete(item)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                        Excluir
                      </button>
                    </div>
                  </details>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
