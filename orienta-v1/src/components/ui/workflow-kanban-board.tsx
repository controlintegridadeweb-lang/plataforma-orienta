"use client";

import { formSurface } from "@/lib/layout/form-surface";

const k = formSurface.kanban;

export type WorkflowKanbanColumn<T> = {
  id: string;
  label: string;
  description?: string;
  /** Faixa superior suave (`color-mix` — ver `kanban-column-accents`). */
  accentClass?: string;
  /** @deprecated Preferir `accentClass`; mantido para compatibilidade. */
  columnClassName?: string;
  items: T[];
};

type Props<T> = {
  columns: WorkflowKanbanColumn<T>[];
  getItemKey: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  showEmptyColumns?: boolean;
  emptyColumnMessage?: string;
  className?: string;
  /** Rodapé opcional dentro do painel (ex.: totais por status). */
  footer?: React.ReactNode;
};

/**
 * Quadro Kanban horizontal alinhado ao design system (`formSurface.kanban`).
 */
export function WorkflowKanbanBoard<T>({
  columns,
  getItemKey,
  renderCard,
  showEmptyColumns = true,
  emptyColumnMessage = "Nenhum item",
  className = "",
  footer,
}: Props<T>) {
  const visible = showEmptyColumns
    ? columns
    : columns.filter((c) => c.items.length > 0);

  if (visible.length === 0) return null;

  return (
    <div className={`${k.board} ${className}`.trim()} role="region" aria-label="Quadro Kanban">
      <div className={k.boardInner}>
        <div className={k.scrollX}>
          <div className={k.columnsRow}>
            {visible.map((column) => {
              const accent =
                column.accentClass ??
                "bg-[color-mix(in_srgb,var(--color-slate-400)_35%,transparent)]";
              return (
                <section
                  key={column.id}
                  aria-label={`Coluna ${column.label}`}
                  className={k.column}
                >
                  <div className={`${k.columnAccent} ${accent}`} aria-hidden />
                  <header className={k.columnHeader}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className={k.columnTitle}>{column.label}</h3>
                        {column.description ? (
                          <p className={k.columnDescription}>{column.description}</p>
                        ) : null}
                      </div>
                      <span className={k.columnCount}>{column.items.length}</span>
                    </div>
                  </header>

                  <ul className={k.columnBody}>
                    {column.items.length === 0 ? (
                      <li className={k.empty}>{emptyColumnMessage}</li>
                    ) : (
                      column.items.map((item) => (
                        <li key={getItemKey(item)}>{renderCard(item)}</li>
                      ))
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>

        {footer ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-3 text-micro text-slate-500">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
