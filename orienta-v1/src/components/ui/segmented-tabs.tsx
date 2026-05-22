"use client";

export type SegmentTab<T extends string> = {
  id: T;
  label: string;
  /** Tooltip (title nativo). */
  title?: string;
};

const tabClasses = (selected: boolean) =>
  selected
    ? "bg-brand text-white shadow-sm"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

type SegmentedTabsProps<T extends string> = {
  "aria-label": string;
  items: SegmentTab<T>[];
  value: T;
  onChange: (id: T) => void;
  /**
   * `card` — contorno branco tipo barra elevada (Biblioteca, Plano de acao).
   * `bare` — apenas tablist para embutir em faixa pai (ex.: FAMI).
   */
  variant?: "card" | "bare";
};

/**
 * Troca de vistas no mesmo cliente; ativo sempre com acento de marca (token `brand`).
 */
export function SegmentedTabs<T extends string>({
  "aria-label": ariaLabel,
  items,
  value,
  onChange,
  variant = "card",
}: SegmentedTabsProps<T>) {
  const inner = (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label={ariaLabel}>
      {items.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={String(tab.id)}
            type="button"
            role="tab"
            title={tab.title}
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`min-h-[2.5rem] rounded-lg px-4 py-2 text-sm font-medium transition ${tabClasses(
              selected,
            )}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === "bare") {
    return inner;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm">{inner}</div>
  );
}
