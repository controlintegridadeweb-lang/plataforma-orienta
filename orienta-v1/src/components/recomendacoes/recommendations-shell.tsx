"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Filter, Loader2, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type {
  RecommendationFilterOptions,
  RecommendationListItem,
  RecommendationsListResult,
} from "@/lib/recommendations/admin-service";
import {
  listRecommendations,
  loadRecommendationFilters,
} from "@/lib/recommendations/client";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import { describeError, notify } from "@/lib/notify";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import { formSurface } from "@/lib/form-surface";
import { RecommendationTypeBadge } from "./recommendation-type-badge";
import { RecommendationActions } from "./recommendation-actions";
import { RecommendationHistory } from "./recommendation-history";
import { RegeneratePanel } from "./regenerate-panel";
import { STATUS_LABELS, StatusBadge } from "./status-badge";
import { staffPlanoAcaoHref, staffAreaFromPathname } from "@/lib/navigation/staff-paths";

const PAGE_SIZE = 50;

const ALL_STATUSES: RecommendationStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
];

function normalizeRecommendationInitialStatus(
  value: string | RecommendationStatus | undefined,
): "" | RecommendationStatus {
  if (value == null || value === "") return "";
  const s = String(value);
  return ALL_STATUSES.includes(s as RecommendationStatus) ? (s as RecommendationStatus) : "";
}

export type RecommendationsShellInitialFilters = {
  organizationId?: string;
  formId?: string;
  axisId?: string;
  recommendationId?: string;
  status?: RecommendationStatus;
};

export function RecommendationsShell({
  initialFilters,
}: {
  initialFilters?: RecommendationsShellInitialFilters;
} = {}) {
  const staffArea = staffAreaFromPathname(usePathname() ?? "");
  const [filters, setFilters] = useState<RecommendationFilterOptions | null>(null);

  const [formId, setFormId] = useState<string>(initialFilters?.formId ?? "");
  const [organizationId, setOrganizationId] = useState<string>(initialFilters?.organizationId ?? "");
  const [axisId, setAxisId] = useState<string>(initialFilters?.axisId ?? "");
  const [recommendationId, setRecommendationId] = useState<string>(
    initialFilters?.recommendationId ?? "",
  );
  const [status, setStatus] = useState<"" | RecommendationStatus>(() =>
    normalizeRecommendationInitialStatus(initialFilters?.status),
  );
  const [type, setType] = useState<string>("");
  const [offset, setOffset] = useState<number>(0);

  const [result, setResult] = useState<RecommendationsListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendationFilters()
      .then(setFilters)
      .catch((e: unknown) =>
        notify.error(describeError(e, "Falha ao carregar filtros.")),
      );
  }, []);

  const fetchList = useCallback(
    async (nextOffset: number) => {
      setLoading(true);
      try {
        const res = await listRecommendations({
          formId: formId || undefined,
          organizationId: organizationId || undefined,
          axisId: axisId || undefined,
          recommendationId: recommendationId || undefined,
          status: status || undefined,
          type: type || undefined,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setResult(res);
      } catch (e: unknown) {
        notify.error(describeError(e, "Falha ao carregar recomendações."));
      } finally {
        setLoading(false);
      }
    },
    [formId, organizationId, axisId, recommendationId, status, type],
  );

  useEffect(() => {
    setOffset(0);
    void fetchList(0);
  }, [fetchList]);

  function handleClear() {
    setFormId("");
    setOrganizationId("");
    setAxisId("");
    setRecommendationId("");
    setStatus("");
    setType("");
  }

  function replaceItem(updated: RecommendationListItem) {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) => (it.id === updated.id ? updated : it)),
          }
        : prev,
    );
  }

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageStart = items.length > 0 ? offset + 1 : 0;
  const pageEnd = offset + items.length;

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (formId) {
      const f = filters?.forms.find((x) => x.id === formId);
      chips.push({
        key: "form",
        label: f ? `Formulário: ${f.name}` : "Formulário selecionado",
        onRemove: () => setFormId(""),
      });
    }
    if (organizationId) {
      const o = filters?.organizations.find((x) => x.id === organizationId);
      chips.push({
        key: "org",
        label: o ? `Organização: ${o.name}` : "Organização selecionada",
        onRemove: () => setOrganizationId(""),
      });
    }
    if (axisId) {
      const a = filters?.axes.find((x) => x.id === axisId);
      chips.push({
        key: "axis",
        label: a ? `Eixo: ${a.name}` : "Eixo selecionado",
        onRemove: () => setAxisId(""),
      });
    }
    if (status) {
      chips.push({
        key: "status",
        label: `Status: ${STATUS_LABELS[status]}`,
        onRemove: () => setStatus(""),
      });
    }
    if (type) {
      chips.push({
        key: "type",
        label: `Tipo: ${recommendationTypeLabel(type)}`,
        onRemove: () => setType(""),
      });
    }
    if (recommendationId) {
      chips.push({
        key: "rec",
        label: `ID (URL): ${recommendationId.slice(0, 8)}…`,
        onRemove: () => setRecommendationId(""),
      });
    }
    return chips;
  }, [filters, formId, organizationId, axisId, status, type, recommendationId]);

  return (
    <section className="space-y-4">
      {filters ? (
        <RegeneratePanel
          filters={filters}
          onCompleted={() => void fetchList(offset)}
        />
      ) : null}

      <div className={formSurface.card}>
        <div
          className={`${formSurface.cardHeader} flex flex-wrap items-center justify-between gap-3 border-b border-slate-100`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Filter className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Filtros da fila</p>
              <p className="text-xs text-slate-600">
                Combine critérios para reduzir o volume antes de editar linha a linha.
              </p>
            </div>
            {loading ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="text-xs font-medium text-slate-600">
            {total > 0 ? (
              <>
                <span className="tabular-nums font-semibold text-slate-900">
                  {pageStart}-{pageEnd}
                </span>{" "}
                de <span className="tabular-nums font-semibold text-slate-900">{total}</span>
              </>
            ) : (
              "Sem resultados"
            )}
          </p>
        </div>
        <div className={`${formSurface.body} grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6`}>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formulário</span>
            <select
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
            >
              <option value="">Todos</option>
              {filters?.forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (v{f.version})
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Organização</span>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={(filters?.organizations.length ?? 0) <= 1}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal disabled:cursor-not-allowed`}
            >
              <option value="">Todas</option>
              {filters?.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Eixo (FAMI)</span>
            <select
              value={axisId}
              onChange={(e) => setAxisId(e.target.value)}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
            >
              <option value="">Todos</option>
              {filters?.axes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | RecommendationStatus)}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
            >
              <option value="">Todos</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Tipo</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
            >
              <option value="">Todos</option>
              {filters?.types.map((t) => (
                <option key={t} value={t}>
                  {recommendationTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleClear}
            disabled={activeFilters.length === 0 && !recommendationId}
            className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar filtros
          </button>
        </div>
        {activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-6">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Ativos
            </span>
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className={`${formSurface.chip.base} ${formSurface.chip.neutral} pr-1`}
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={formSurface.table.wrapper}>
        <table className={formSurface.table.table}>
          <thead className="sticky top-0 z-10 border-b border-slate-200/80 bg-slate-50/95 backdrop-blur">
            <tr>
              <th
                className={`${formSurface.table.headCell} pl-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:pl-5`}
              >
                Organização
              </th>
              <th
                className={`${formSurface.table.headCell} max-w-[10rem] text-[11px] font-semibold uppercase tracking-wider text-slate-500 xl:max-w-[12rem]`}
              >
                Formulário
              </th>
              <th
                className={`${formSurface.table.headCell} max-w-[9rem] text-[11px] font-semibold uppercase tracking-wider text-slate-500`}
              >
                Eixo / Seção
              </th>
              <th
                className={`${formSurface.table.headCell} min-w-[10rem] max-w-[14rem] text-[11px] font-semibold uppercase tracking-wider text-slate-500`}
              >
                Pergunta
              </th>
              <th className={`${formSurface.table.headCell} text-[11px] font-semibold uppercase tracking-wider text-slate-500`}>
                Tipo
              </th>
              <th className={`${formSurface.table.headCell} text-[11px] font-semibold uppercase tracking-wider text-slate-500`}>
                Status
              </th>
              <th
                className={`${formSurface.table.headCell} min-w-[12rem] max-w-[18rem] text-[11px] font-semibold uppercase tracking-wider text-slate-500`}
              >
                Texto atual
              </th>
              <th
                className={`${formSurface.table.headCell} pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:pr-5`}
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody className={formSurface.table.body}>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
                    Carregando recomendações…
                  </span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Nenhuma recomendação com os filtros atuais.
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                    Ajuste ou limpe os filtros para ver mais resultados.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const open = expandedId === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr className={formSurface.table.row}>
                      <td className={`${formSurface.table.cell} pl-4 font-medium text-slate-900 sm:pl-5`}>
                        {item.organizationName}
                      </td>
                      <td className={`${formSurface.table.cell} max-w-[12rem]`}>
                        <div className="truncate font-medium text-slate-800" title={item.formName}>
                          {item.formName}
                        </div>
                        <div className="text-xs text-slate-500">v{item.formVersion}</div>
                      </td>
                      <td className={`${formSurface.table.cell} max-w-[10rem]`}>
                        <div className="truncate text-slate-800" title={item.axisName}>
                          {item.axisName || "—"}
                        </div>
                        <div className="truncate text-xs text-slate-500" title={item.sectionName}>
                          {item.sectionName || "—"}
                        </div>
                      </td>
                      <td className={`${formSurface.table.cell} max-w-[14rem]`}>
                        <p className="line-clamp-3 text-slate-700">{item.questionPrompt}</p>
                      </td>
                      <td className={formSurface.table.cell}>
                        <RecommendationTypeBadge type={item.recommendationType} />
                      </td>
                      <td className={formSurface.table.cell}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className={`${formSurface.table.cell} max-w-[18rem]`}>
                        <p className="line-clamp-3 whitespace-pre-wrap text-slate-700">{item.currentText}</p>
                        {item.currentText !== item.originalText ? (
                          <span className="mt-1 inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200/80">
                            Texto editado
                          </span>
                        ) : null}
                      </td>
                      <td className={`${formSurface.table.cell} whitespace-nowrap text-right align-top pr-4 sm:pr-5`}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : item.id)}
                          className={
                            open
                              ? `${formSurface.secondaryButtonSm} border-brand-300 bg-brand-50 text-brand-900 hover:bg-brand-100/80`
                              : formSurface.secondaryButtonSm
                          }
                          aria-expanded={open}
                        >
                          {open ? "Fechar edição" : "Editar"}
                        </button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-gradient-to-b from-slate-50/95 to-white">
                        <td colSpan={8} className="border-t border-slate-200 px-4 py-5 sm:px-6">
                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,1fr)]">
                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5">
                              <p className={formSurface.label}>Editar recomendação</p>
                              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                Status, texto e comentário para o histórico. Alterações só são gravadas ao
                                salvar.
                              </p>
                              <div className="mt-4">
                                <RecommendationActions
                                  item={item}
                                  onUpdated={(result) => replaceItem(result.item)}
                                />
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5">
                                <p className={formSurface.label}>Histórico e vínculos</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                  Auditoria de mudanças e acesso ao plano de ação, quando existir.
                                </p>
                                <div className="mt-4">
                                  <RecommendationHistory recommendationId={item.id} />
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                                {item.hasActionPlan ? (
                                  <Link
                                    href={staffPlanoAcaoHref(staffArea, item.id)}
                                    className="font-semibold text-brand-700 hover:underline"
                                  >
                                    Ver plano de ação vinculado
                                  </Link>
                                ) : (
                                  <span className="text-slate-500">Sem plano de ação vinculado a esta recomendação.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600 sm:px-5 ${formSurface.card}`}
        >
          <span className="tabular-nums">
            <span className="font-semibold text-slate-900">
              {pageStart}-{pageEnd}
            </span>{" "}
            de <span className="font-semibold text-slate-900">{total}</span> recomendações
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => {
                const next = Math.max(0, offset - PAGE_SIZE);
                setOffset(next);
                void fetchList(next);
              }}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pageEnd >= total || loading}
              onClick={() => {
                const next = offset + PAGE_SIZE;
                setOffset(next);
                void fetchList(next);
              }}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
