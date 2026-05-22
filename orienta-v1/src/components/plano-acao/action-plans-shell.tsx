"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronUp } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import { STATUS_LABELS, StatusBadge } from "@/components/recomendacoes/status-badge";
import { RecommendationHistory } from "@/components/recomendacoes/recommendation-history";
import type { ActionPlanListItem } from "@/lib/action-plans/client";
import { listActionPlans, saveActionPlan } from "@/lib/action-plans/client";
import type { ActionPlanListView } from "@/lib/action-plans/schemas";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import { describeError, notify } from "@/lib/notify";
import { PlanAuditHistory } from "./plan-audit-history";
import { PLAN_STATUS_LABELS, PlanStatusBadge, SlaBadge } from "./plan-status-badge";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { staffRecomendacoesHref, staffAreaFromPathname } from "@/lib/navigation/staff-paths";

const PAGE_SIZE = 50;

const ALL_REC_STATUSES: RecommendationStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
];

const ALL_PLAN_STATUSES: PlanStatus[] = [
  "to_implement",
  "in_progress",
  "completed",
  "cancelled",
];

type UiView = ActionPlanListView;

const VIEW_TABS: { id: UiView; label: string; hint: string }[] = [
  { id: "overview", label: "Visão geral", hint: "Todas as recomendações e planos no escopo dos filtros." },
  { id: "backlog", label: "Pendentes", hint: "Sem plano ativo de execução ou com plano a implementar/cancelado." },
  { id: "in_progress", label: "Em andamento", hint: "Planos em execução." },
  { id: "completed", label: "Concluídos", hint: "Planos concluídos." },
];

function isPermissionMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("forbidden") ||
    m.includes("permitida") ||
    m.includes("permissao") ||
    m.includes("403")
  );
}

function isUiView(value: string): value is UiView {
  return VIEW_TABS.some((t) => t.id === value);
}

const selectFieldClass = `${formSurface.inputSelect} w-full`;
const textFieldClass = `${formSurface.input} w-full`;

export type ActionPlansShellProps = {
  /** Vista inicial (URL `view`), ex.: backlog, in_progress */
  initialView?: string;
  initialFilters?: { organizationId?: string; formId?: string; recommendationId?: string };
};

export function ActionPlansShell({
  initialView,
  initialFilters,
}: ActionPlansShellProps = {}) {
  const staffArea = staffAreaFromPathname(usePathname() ?? "");
  const [filters, setFilters] = useState<RecommendationFilterOptions | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const [uiView, setUiView] = useState<UiView>(() =>
    initialView && isUiView(initialView) ? initialView : "overview",
  );
  const [formId, setFormId] = useState(initialFilters?.formId ?? "");
  const [organizationId, setOrganizationId] = useState(initialFilters?.organizationId ?? "");
  const [recommendationStatus, setRecommendationStatus] = useState<"" | RecommendationStatus>("");
  const [planStatus, setPlanStatus] = useState<"" | PlanStatus>("");
  const [responsibleContains, setResponsibleContains] = useState("");
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "due_7d">("all");
  const [recommendationIdFocus] = useState(initialFilters?.recommendationId ?? "");
  const [offset, setOffset] = useState(0);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [items, setItems] = useState<ActionPlanListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveErrorByRec, setSaveErrorByRec] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRecommendationFilters()
      .then(setFilters)
      .catch((e: unknown) =>
        setFilterError(e instanceof Error ? e.message : "Falha ao carregar filtros."),
      );
  }, []);

  const fetchList = useCallback(
    async (nextOffset: number) => {
      setLoading(true);
      setListError(null);
      try {
        const res = await listActionPlans({
          formId: formId || undefined,
          organizationId: organizationId || undefined,
          recommendationId: recommendationIdFocus.trim() || undefined,
          view: uiView,
          recommendationStatus: recommendationStatus || undefined,
          planStatus: planStatus || undefined,
          responsibleContains: responsibleContains.trim() || undefined,
          search: search.trim() || undefined,
          dueFilter: dueFilter === "all" ? undefined : dueFilter,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });
        setItems(res.items);
        setTotal(res.total);
      } catch (e: unknown) {
        const msg = describeError(e, "Falha ao carregar.");
        setListError(msg);
        if (isPermissionMessage(msg)) {
          notify.error(
            "Você não tem permissão para este escopo ou recurso. Ajuste a organização ou o perfil.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [
      uiView,
      formId,
      organizationId,
      recommendationIdFocus,
      recommendationStatus,
      planStatus,
      responsibleContains,
      search,
      dueFilter,
    ],
  );

  useEffect(() => {
    setOffset(0);
    void fetchList(0);
  }, [fetchList]);

  function handleClear() {
    setFormId("");
    setOrganizationId("");
    setRecommendationStatus("");
    setPlanStatus("");
    setResponsibleContains("");
    setSearch("");
    setDueFilter("all");
    setShowMoreFilters(false);
  }

  async function handleSave(row: ActionPlanListItem, formData: FormData) {
    setSaveErrorByRec((prev) => ({ ...prev, [row.recommendationId]: "" }));
    try {
      await saveActionPlan({
        planId: row.plans[0]?.id,
        recommendationId: row.recommendationId,
        formId: row.formId,
        actionText: String(formData.get("actionText") ?? ""),
        dueDate: String(formData.get("dueDate") ?? ""),
        responsibleSector: String(formData.get("responsibleSector") ?? ""),
        responsibleName: String(formData.get("responsibleName") ?? ""),
        status: String(formData.get("status") ?? "to_implement") as PlanStatus,
        observations: String(formData.get("observations") ?? ""),
      });
      notify.success("Plano salvo. A lista foi atualizada.");
      void fetchList(offset);
    } catch (e: unknown) {
      const msg = describeError(e, "Falha ao salvar.");
      const isConflict = msg.toLowerCase().includes("conflict") || msg.includes("409");
      const finalMsg = isConflict
        ? "Conflito ao salvar: outro usuário pode ter alterado este plano. Recarregue e tente novamente."
        : msg;
      setSaveErrorByRec((prev) => ({ ...prev, [row.recommendationId]: finalMsg }));
      notify.error(finalMsg);
    }
  }

  const pageStart = items.length > 0 ? offset + 1 : 0;
  const pageEnd = offset + items.length;
  const dueDisabled = uiView === "backlog";
  const planStatusDisabled = uiView !== "overview";
  const activeViewLabel = VIEW_TABS.find((t) => t.id === uiView)?.label ?? "";

  return (
    <section className={layout.panelStack}>
      <SegmentedTabs<UiView>
        aria-label="Vistas do plano de ação"
        value={uiView}
        onChange={setUiView}
        items={VIEW_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          title: tab.hint,
        }))}
      />

      <div className={`p-4 md:p-5 ${formSurface.dashboardPanel}`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Formulário
            <select
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className={selectFieldClass}
            >
              <option value="">Todos</option>
              {filters?.forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (v{f.version})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Organização
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={(filters?.organizations.length ?? 0) <= 1}
              className={selectFieldClass}
            >
              <option value="">Todas</option>
              {filters?.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Status do plano
            <select
              value={planStatus}
              onChange={(e) => setPlanStatus(e.target.value as "" | PlanStatus)}
              disabled={planStatusDisabled}
              title={
                planStatusDisabled
                  ? "Filtro só se aplica na Visão geral; outras abas já filtram pelo status do plano."
                  : undefined
              }
              className={selectFieldClass}
            >
              <option value="">Todos</option>
              {ALL_PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PLAN_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Prazo do plano
            <select
              value={dueFilter}
              onChange={(e) =>
                setDueFilter(e.target.value as "all" | "overdue" | "due_7d")
              }
              disabled={dueDisabled}
              title={
                dueDisabled
                  ? "Filtro de prazo não se aplica ao Backlog (itens podem estar sem plano)."
                  : undefined
              }
              className={selectFieldClass}
            >
              <option value="all">Todos</option>
              <option value="overdue">Atrasados (abertos)</option>
              <option value="due_7d">Vencem em 7 dias</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowMoreFilters((v) => !v)}
              className={`${formSurface.secondaryButtonSm} text-xs font-semibold`}
              aria-expanded={showMoreFilters}
            >
              {showMoreFilters ? "Ocultar filtros" : "Mais filtros"}
            </button>
            <button type="button" onClick={handleClear} className={`${formSurface.secondaryButtonSm} text-xs font-semibold`}>
              Limpar
            </button>
          </div>
        </div>

        {showMoreFilters ? (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Status da recomendação
              <select
                value={recommendationStatus}
                onChange={(e) =>
                  setRecommendationStatus(e.target.value as "" | RecommendationStatus)
                }
                className={selectFieldClass}
              >
                <option value="">Todos</option>
                {ALL_REC_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Responsável / setor
              <input
                value={responsibleContains}
                onChange={(e) => setResponsibleContains(e.target.value)}
                placeholder="Contém..."
                className={textFieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Texto da recomendação
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca no texto..."
                className={textFieldClass}
              />
            </label>
          </div>
        ) : null}

        {filterError ? (
          <p className={`mt-3 ${formSurface.messageError}`}>{filterError}</p>
        ) : null}
      </div>

      {listError ? (
        <div className={formSurface.messageError}>{listError}</div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {activeViewLabel}
          <span className="ml-2 text-xs font-normal text-slate-500">
            {loading ? "carregando..." : `${total} ${total === 1 ? "item" : "itens"}`}
          </span>
        </p>
      </div>

      <div className={formSurface.card}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-sm">
          <thead className="sticky top-0 z-[1] border-b border-slate-200/80 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-2">Organização</th>
              <th className="px-3 py-2">Formulário</th>
              <th className="px-3 py-2">Eixo / Seção</th>
              <th className="px-3 py-2">Recomendação</th>
              <th className="px-3 py-2">Status rec.</th>
              <th className="px-3 py-2">Ação</th>
              <th className="px-3 py-2">Prazo</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2">Status plano</th>
              <th className="px-3 py-2">SLA</th>
              <th className="px-3 py-2">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-sm text-slate-500">
                  Nenhum item encontrado com os filtros e a visão atuais.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <Fragment key={row.recommendationId}>
                  <tr className="align-top transition-colors hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-slate-700">{row.organizationName}</td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="font-medium">{row.formName}</div>
                      <div className="text-xs text-slate-500">v{row.formVersion}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="font-medium">{row.axisName}</div>
                      <div className="text-xs text-slate-500">{row.sectionName}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <p className="line-clamp-3 whitespace-pre-wrap">{row.recommendationText}</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {recommendationTypeLabel(row.recommendationType)}
                      </p>
                      <Link
                        href={staffRecomendacoesHref(staffArea, row.recommendationId)}
                        className="mt-1 inline-block text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Ver na fila de recomendações
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.recommendationStatus} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.plans[0] ? (
                        <p className="line-clamp-3">{row.plans[0].actionText}</p>
                      ) : (
                        <span className="rounded-lg border border-dashed border-slate-200 px-1.5 py-0.5 text-xs text-slate-500">
                          Sem plano
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.plans[0]?.dueDate ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.plans[0] ? (
                        <>
                          <div>{row.plans[0].responsibleName}</div>
                          <div className="text-slate-500">{row.plans[0].responsibleSector}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.plans[0] ? (
                        <PlanStatusBadge status={row.plans[0].status} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <SlaBadge label={row.slaLabel} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="group inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                        onClick={() =>
                          setExpandedId((id) =>
                            id === row.recommendationId ? null : row.recommendationId,
                          )
                        }
                        aria-expanded={expandedId === row.recommendationId}
                      >
                        {expandedId === row.recommendationId ? (
                          <>
                            Fechar
                            <ChevronUp
                              className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100"
                              aria-hidden
                            />
                          </>
                        ) : (
                          <>
                            Editar
                            <ChevronRight
                              className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100"
                              aria-hidden
                            />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedId === row.recommendationId ? (
                    <tr className="bg-slate-50/80">
                      <td colSpan={11} className="px-3 py-4">
                        <div className="mx-auto max-w-4xl space-y-3">
                          {saveErrorByRec[row.recommendationId] ? (
                            <p className="text-sm text-rose-600">
                              {saveErrorByRec[row.recommendationId]}
                            </p>
                          ) : null}
                          <form
                            className="grid gap-2 md:grid-cols-2"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await handleSave(row, new FormData(e.currentTarget));
                            }}
                          >
                            <input
                              name="actionText"
                              className={`${formSurface.input} md:col-span-2`}
                              defaultValue={row.plans[0]?.actionText ?? ""}
                              placeholder="Ação a ser adotada"
                              required
                            />
                            <input
                              name="dueDate"
                              type="date"
                              className={formSurface.input}
                              defaultValue={row.plans[0]?.dueDate ?? ""}
                              required
                            />
                            <input
                              name="responsibleSector"
                              className={formSurface.input}
                              defaultValue={row.plans[0]?.responsibleSector ?? ""}
                              placeholder="Setor responsável"
                              required
                            />
                            <input
                              name="responsibleName"
                              className={formSurface.input}
                              defaultValue={row.plans[0]?.responsibleName ?? ""}
                              placeholder="Responsável nominal"
                              required
                            />
                            <select
                              name="status"
                              className={formSurface.inputSelect}
                              defaultValue={row.plans[0]?.status ?? "to_implement"}
                            >
                              <option value="to_implement">A implementar</option>
                              <option value="in_progress">Em andamento</option>
                              <option value="completed">Concluída</option>
                              <option value="cancelled">Cancelada</option>
                            </select>
                            <textarea
                              name="observations"
                              className={`${formSurface.inputTextarea} min-h-[4rem] md:col-span-2`}
                              defaultValue={row.plans[0]?.observations ?? ""}
                              placeholder="Observações"
                              rows={2}
                            />
                            <button
                              type="submit"
                              className={`${formSurface.primaryButton} w-full md:col-span-2`}
                            >
                              Salvar plano
                            </button>
                          </form>
                          <RecommendationHistory recommendationId={row.recommendationId} />
                          {row.plans[0] ? <PlanAuditHistory planId={row.plans[0].id} /> : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            {pageStart}-{pageEnd} de {total}
          </span>
          <div className="flex gap-2">
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
