"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type { EntityConfig, FieldSpec } from "@/lib/library/config";
import type { LibraryAxis, LibraryCatalogItem } from "@/lib/library/types";
import { formSurface } from "@/lib/form-surface";

type FormValues = Record<string, string>;

export type EntityModalProps = {
  config: EntityConfig;
  open: boolean;
  editing: LibraryCatalogItem | null;
  axes: LibraryAxis[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

function formatFieldForInput(field: FieldSpec, raw: unknown): string {
  if (raw === null || raw === undefined) {
    if (field.type === "number") return field.min?.toString() ?? "0";
    return "";
  }
  if (field.type === "tags") {
    return Array.isArray(raw) ? (raw as string[]).join(", ") : String(raw);
  }
  return String(raw);
}

function initialFormValues(config: EntityConfig, editing: LibraryCatalogItem | null): FormValues {
  const base: FormValues = {};
  for (const field of config.fields) {
    const raw = editing ? (editing as unknown as Record<string, unknown>)[field.key] : undefined;
    base[field.key] = formatFieldForInput(field, raw);
  }
  return base;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function buildPayload(config: EntityConfig, values: FormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of config.fields) {
    const raw = values[field.key] ?? "";
    if (field.type === "number") {
      const trimmed = raw.trim();
      payload[field.key] = trimmed === "" ? undefined : Number(trimmed);
    } else if (field.type === "textarea") {
      const trimmed = raw.trim();
      payload[field.key] = trimmed === "" ? null : trimmed;
    } else if (field.type === "tags") {
      payload[field.key] = parseTags(raw);
    } else if (field.type === "select") {
      const trimmed = raw.trim();
      payload[field.key] = trimmed === "" ? undefined : trimmed;
    } else {
      const trimmed = raw.trim();
      payload[field.key] = field.key === "code" && trimmed === "" ? undefined : trimmed;
    }
  }
  return payload;
}

function renderField(
  field: FieldSpec,
  value: string,
  onChange: (value: string) => void,
  axes: LibraryAxis[],
  disabled: boolean,
) {
  const inputClass =
    field.type === "textarea"
      ? formSurface.inputTextarea
      : field.type === "select" || field.type === "relation"
        ? formSurface.inputSelect
        : formSurface.input;
  const commonProps = {
    id: `field-${field.key}`,
    name: field.key,
    required: field.required,
    disabled,
    value,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => onChange(event.target.value),
    className: inputClass,
  };

  if (field.type === "textarea") {
    return <textarea {...commonProps} rows={3} placeholder={field.placeholder} />;
  }
  if (field.type === "select") {
    return (
      <select {...commonProps}>
        <option value="">
          {field.required ? "Selecione..." : "(usar padrao)"}
        </option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "relation") {
    return (
      <select {...commonProps}>
        <option value="" disabled>
          Selecione um eixo...
        </option>
        {axes.map((axis) => (
          <option key={axis.id} value={axis.id}>
            {axis.code} - {axis.name}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "number") {
    return (
      <input
        {...commonProps}
        type="number"
        min={field.min}
        max={field.max}
        step={1}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "tags") {
    return <input {...commonProps} type="text" placeholder={field.placeholder} />;
  }
  return <input {...commonProps} type="text" placeholder={field.placeholder} />;
}

type EntityFormProps = {
  config: EntityConfig;
  editing: LibraryCatalogItem | null;
  axes: LibraryAxis[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

function EntityForm({
  config,
  editing,
  axes,
  submitting,
  onClose,
  onSubmit,
}: EntityFormProps) {
  const [values, setValues] = useState<FormValues>(() => initialFormValues(config, editing));
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const basicFields = useMemo(
    () => config.fields.filter((field) => (field.mode ?? "basic") === "basic"),
    [config.fields],
  );
  const advancedFields = useMemo(
    () => config.fields.filter((field) => field.mode === "advanced"),
    [config.fields],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit(buildPayload(config, values));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  }

  function renderOneField(field: FieldSpec) {
    const isReadOnly = Boolean(field.readOnlyOnEdit && editing);
    return (
      <div key={field.key} className="space-y-1">
        <label
          htmlFor={`field-${field.key}`}
          className={formSurface.label}
        >
          {field.label}
          {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
        </label>
        {renderField(
          field,
          values[field.key] ?? "",
          (next) => setValues((prev) => ({ ...prev, [field.key]: next })),
          axes,
          submitting || isReadOnly,
        )}
        {field.help ? <p className="text-xs text-slate-500">{field.help}</p> : null}
        {isReadOnly ? (
          <p className="text-xs text-slate-400">
            Identificador bloqueado apos criacao para preservar historico.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4 max-h-[70vh] overflow-y-auto">
      {basicFields.map(renderOneField)}

      {advancedFields.length > 0 ? (
        <div className="rounded-md border border-slate-200">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            aria-expanded={advancedOpen}
          >
            <span className="flex items-center gap-2">
              {advancedOpen ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              )}
              Opcoes avancadas
            </span>
            <span className="text-[10px] font-normal normal-case text-slate-400">
              Identificador, ordenacao e campos tecnicos
            </span>
          </button>
          {advancedOpen ? (
            <div className="space-y-4 border-t border-slate-200 px-3 py-3">
              {advancedFields.map(renderOneField)}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <div className={formSurface.messageError}>{error}</div> : null}

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={formSurface.secondaryButton}
        >
          Cancelar
        </button>
        <button type="submit" disabled={submitting} className={formSurface.primaryButton}>
          {submitting ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function EntityModal({
  config,
  open,
  editing,
  axes,
  submitting,
  onClose,
  onSubmit,
}: EntityModalProps) {
  const title = useMemo(
    () => (editing ? `Editar ${config.singular}` : config.addLabel),
    [editing, config],
  );

  if (!open) return null;

  const formKey = `${config.entity}:${editing?.id ?? "new"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-100/80">
        <div className="flex items-center justify-between border-b border-slate-100/80 bg-brand-50 px-5 py-4">
          <h3 className={formSurface.cardTitle}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <EntityForm
          key={formKey}
          config={config}
          editing={editing}
          axes={axes}
          submitting={submitting}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
