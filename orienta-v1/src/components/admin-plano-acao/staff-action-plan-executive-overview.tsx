"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { MetricCard } from "@/components/ui/metric-card";
import { PanelSection } from "@/components/ui/panel-section";
import { AdminActionPlanProgress } from "@/components/admin-plano-acao/admin-action-plan-progress";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";
import { computeActionSla } from "@/lib/domain/action-plans";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import { STATUS_META } from "@/lib/recommendations/admin-presentation";
import { progressFromPlans } from "@/lib/recommendations/respondent-presentation";
import { staffPlanoAcaoDetailHref, staffAreaFromPathname } from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";
import { useRecommendationDetailContext } from "@/components/recommendations-hub/recommendation-detail-context";

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function buildInstitutionalSummary(
  viewLabel: string,
  progress: number,
  stats: { overdue: number; noResp: number; completed: number; total: number },
  hasPlan: boolean,
): string {
  if (!hasPlan || stats.total === 0) {
    return "A organização ainda não estruturou o plano de ação desta recomendação. Acompanhe a evolução e registre orientações na supervisão quando necessário.";
  }
  if (stats.completed === stats.total) {
    return `Plano concluído pela organização (${viewLabel.toLowerCase()}). Revise entregas e evidências antes de encerrar o ciclo institucional.`;
  }
  if (stats.overdue > 0) {
    return `Execução em andamento com ${stats.overdue} ação(ões) em atraso. Situação atual: ${viewLabel.toLowerCase()} — requer acompanhamento gerencial.`;
  }
  if (progress < 40) {
    return `Plano iniciado (${progress}% de progresso). Andamento: ${viewLabel.toLowerCase()} — a organização está estruturando a execução.`;
  }
  return `Execução em curso (${progress}% de progresso). Situação institucional: ${viewLabel.toLowerCase()}.`;
}

/** Resumo executivo do plano — primeira aba do workspace de supervisão (admin). */
export function StaffActionPlanExecutiveOverview() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const staffItem = ctx.staffItem;
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);

  const plans = row?.plans ?? [];
  const progress = useMemo(() => progressFromPlans(plans), [plans]);

  const stats = useMemo(() => {
    let overdue = 0;
    let noResp = 0;
    let completed = 0;
    for (const p of plans) {
      if (p.status === "completed") completed += 1;
      if (!p.responsibleName?.trim()) noResp += 1;
      if (
        p.status !== "completed" &&
        p.status !== "cancelled" &&
        computeActionSla({ dueDate: p.dueDate, status: p.status }) === "overdue"
      ) {
        overdue += 1;
      }
    }
    return { overdue, noResp, completed, total: plans.length };
  }, [plans]);

  if (!row || !staffItem) return null;

  const acoesHref = staffPlanoAcaoDetailHref(area, row.recommendationId, "acoes");
  const monitoramentoHref = staffPlanoAcaoDetailHref(area, row.recommendationId, "monitoramento");
  const viewMeta = STATUS_META[staffItem.view];
  const overdue = staffItem.isOverdue;

  const blockers: string[] = [];
  if (!staffItem.hasPlan || stats.total === 0) {
    blockers.push("Plano de ação ainda não cadastrado pela organização");
  }
  if (stats.overdue > 0) {
    blockers.push(`${stats.overdue} ação(ões) com prazo vencido`);
  }
  if (stats.noResp > 0) {
    blockers.push(`${stats.noResp} ação(ões) sem responsável definido`);
  }

  const summaryText = buildInstitutionalSummary(
    viewMeta.label,
    progress,
    stats,
    staffItem.hasPlan,
  );

  const pendingCount = stats.total - stats.completed;

  return (
    <div className={layout.panelStack}>
      <section className={`${formSurface.dashboardPanel} space-y-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Resumo do plano
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <AdminRecommendationStatusBadge view={staffItem.view} size="md" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-500">Progresso consolidado</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{progress}%</p>
          </div>
        </div>

        <AdminActionPlanProgress value={progress} overdue={overdue} size="sm" />

        <dl className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className={formSurface.label}>Organização</dt>
            <dd className="mt-0.5 text-slate-800">{row.organizationName}</dd>
          </div>
          <div>
            <dt className={formSurface.label}>Formulário</dt>
            <dd className="mt-0.5 text-slate-800">
              {row.formName}
              <span className="tabular-nums text-slate-400"> v{staffItem.formVersion}</span>
            </dd>
          </div>
          <div>
            <dt className={formSurface.label}>Eixo</dt>
            <dd className="mt-0.5 text-slate-800">{row.axisName || "—"}</dd>
          </div>
          <div>
            <dt className={formSurface.label}>Prazo</dt>
            <dd className="mt-0.5 inline-flex items-center gap-1 text-slate-800">
              <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {formatDateShort(staffItem.dueDate)}
              {overdue ? (
                <span className="ml-1 text-xs font-semibold text-rose-700">Atrasado</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className={formSurface.label}>Responsável</dt>
            <dd className="mt-0.5 inline-flex items-center gap-1 text-slate-800">
              <User className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              {staffItem.responsibleName || "Não definido"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          variant="default"
          density="compact"
          label="Progresso"
          value={`${progress}%`}
          secondary="Consolidado das ações"
          icon={TrendingUp}
        />
        <MetricCard
          variant="neutral"
          density="compact"
          label="Total de ações"
          value={stats.total}
          secondary={`${stats.completed} concluída(s)`}
          icon={ClipboardList}
        />
        <MetricCard
          variant={stats.overdue > 0 ? "danger" : "neutral"}
          density="compact"
          label="Atrasadas"
          value={stats.overdue}
          secondary={stats.overdue > 0 ? "Exigem supervisão" : "Em dia"}
          icon={AlertTriangle}
          status={stats.overdue > 0 ? "critical" : "ok"}
        />
        <MetricCard
          variant={pendingCount > 0 ? "warning" : "success"}
          density="compact"
          label="Pendências"
          value={pendingCount + stats.noResp}
          secondary={
            stats.noResp > 0
              ? `${stats.noResp} sem responsável`
              : pendingCount > 0
                ? "Em execução"
                : "Nenhuma pendência"
          }
          icon={User}
          status={stats.noResp > 0 || stats.overdue > 0 ? "attention" : "neutral"}
        />
      </div>

      <PanelSection
        title="Situação do plano"
        description="Leitura gerencial — andamento, bloqueios e contexto institucional."
        variant="card"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-700">{summaryText}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
              <p className={formSurface.label}>Andamento atual</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{viewMeta.label}</p>
              <p className={`mt-1 ${typography.meta}`}>{viewMeta.description}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
              <p className={formSurface.label}>Situação institucional</p>
              {blockers.length === 0 ? (
                <p className="mt-1 text-sm text-slate-700">
                  Nenhum bloqueio crítico identificado no momento.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {blockers.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-sm text-amber-950"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Link
              href={acoesHref}
              className={`${formSurface.secondaryButtonSm} inline-flex items-center gap-1`}
            >
              Ver execução
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              href={monitoramentoHref}
              className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1`}
            >
              Ir para monitoramento
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </PanelSection>

      <PanelSection
        title="Impacto FAMI"
        description="Contribuição esperada na maturidade institucional."
        variant="card"
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">
            <Sparkles className="mr-1 inline h-4 w-4 text-brand-600" aria-hidden />
            {recommendationTypeLabel(row.recommendationType)} no eixo{" "}
            <strong className="font-medium text-slate-800">{row.axisName || "estrutural"}</strong>.
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className={formSurface.label}>Impacto esperado</dt>
              <dd className="mt-0.5 text-slate-800">
                Elevação da maturidade vinculada à conclusão do plano de ação.
              </dd>
            </div>
            <div>
              <dt className={formSurface.label}>Evolução prevista</dt>
              <dd className="mt-0.5 inline-flex items-center gap-1 text-slate-800">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                Progresso de execução em{" "}
                <strong className="tabular-nums">{progress}%</strong>
              </dd>
            </div>
          </dl>
        </div>
      </PanelSection>
    </div>
  );
}
