"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Eye,
  Paperclip,
} from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { Spinner } from "@/components/ui/loading";
import { StatusBadge } from "@/components/evidencias/status-badge";
import { useRecommendationDetailContext } from "@/components/recommendations-hub/recommendation-detail-context";
import { EntityHistoryTimeline } from "@/components/workflow/entity-history-timeline";
import {
  fetchAdminRecPlanTimelineEvents,
  type AdminRecPlanTimelineEvent,
} from "@/components/workflow/admin-rec-plan-timeline-shared";
import { ActionPlanAuditFeed, type AuditFeedItem } from "@/components/recommendations-hub/action-plan-audit-feed";
import { StaffActionPlanInstitutionalFeed } from "@/components/admin-plano-acao/staff-action-plan-institutional-feed";
import { listActionPlanAudit } from "@/lib/action-plans/client";
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import { computeActionSla } from "@/lib/domain/action-plans";
import { listEvidences } from "@/lib/evidences/client";
import type { EvidenceListItem } from "@/lib/evidences/admin-service";
import { evidencesForRecommendationScope } from "@/lib/evidences/recommendation-scope";
import { staffRecomendacoesHref } from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function EvidenceCompactRow({
  item,
  detailHref,
}: {
  item: EvidenceListItem;
  detailHref: string;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{item.title || "Evidência"}</p>
        <p className={`mt-0.5 ${typography.meta}`}>{formatDateTime(item.submittedAt)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={item.currentStatus} />
        <Link href={detailHref} className="text-micro font-semibold text-brand-700 hover:underline">
          Validar
        </Link>
      </div>
    </li>
  );
}

export function StaffActionPlanSupervisionWorkspace() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const staffItem = ctx.staffItem;
  const area = ctx.staffArea ?? "admin";

  const [auditByPlan, setAuditByPlan] = useState<Record<string, ActionPlanAuditEntry[]>>({});
  const [staffTimeline, setStaffTimeline] = useState<AdminRecPlanTimelineEvent[]>([]);
  const [evidences, setEvidences] = useState<EvidenceListItem[]>([]);
  const [evidencesLoading, setEvidencesLoading] = useState(false);

  const plans = row?.plans ?? [];
  const planIdsKey = plans.map((p) => p.id).join(",");

  useEffect(() => {
    if (!row || plans.length === 0) {
      setAuditByPlan({});
      return;
    }
    let cancelled = false;
    async function loadAudits() {
      const entries: Record<string, ActionPlanAuditEntry[]> = {};
      await Promise.all(
        plans.map(async (p) => {
          try {
            entries[p.id] = await listActionPlanAudit(p.id);
          } catch {
            entries[p.id] = [];
          }
        }),
      );
      if (!cancelled) setAuditByPlan(entries);
    }
    void loadAudits();
    return () => {
      cancelled = true;
    };
  }, [row?.recommendationId, planIdsKey, plans]);

  useEffect(() => {
    if (!row || !staffItem) {
      setStaffTimeline([]);
      return;
    }
    let cancelled = false;
    void fetchAdminRecPlanTimelineEvents({
      recommendationId: row.recommendationId,
      planId: staffItem.planId,
      generation: row.recommendationCreatedAt
        ? {
            ts: row.recommendationCreatedAt,
            description: "Recomendação gerada pelo motor FAMI.",
          }
        : null,
    }).then((events) => {
      if (!cancelled) setStaffTimeline(events);
    });
    return () => {
      cancelled = true;
    };
  }, [row?.recommendationId, row?.recommendationCreatedAt, staffItem?.planId]);

  useEffect(() => {
    if (!row) {
      setEvidences([]);
      return;
    }
    let cancelled = false;
    async function loadEvidences() {
      setEvidencesLoading(true);
      try {
        const res = await listEvidences({
          formId: row!.formId,
          organizationId: row!.organizationId,
          limit: 100,
        });
        const filtered = evidencesForRecommendationScope(res.items, {
          questionId: row!.questionId,
          questionPrompt: row!.questionPrompt,
        });
        if (!cancelled) setEvidences(filtered);
      } catch {
        if (!cancelled) setEvidences([]);
      } finally {
        if (!cancelled) setEvidencesLoading(false);
      }
    }
    void loadEvidences();
    return () => {
      cancelled = true;
    };
  }, [row?.formId, row?.organizationId, row?.questionId, row?.questionPrompt]);

  const pendingEvidences = useMemo(
    () =>
      evidences.filter((e) =>
        ["pending", "adjustment_requested"].includes(e.currentStatus),
      ).length,
    [evidences],
  );

  const overdueActions = useMemo(
    () =>
      plans.filter(
        (p) =>
          p.status !== "completed" &&
          p.status !== "cancelled" &&
          computeActionSla({ dueDate: p.dueDate, status: p.status }) === "overdue",
      ).length,
    [plans],
  );

  const planLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans) {
      const t = p.actionText.trim();
      m.set(p.id, t.length > 72 ? `${t.slice(0, 72)}…` : t);
    }
    return m;
  }, [plans]);

  const auditFeedItems: AuditFeedItem[] = useMemo(() => {
    const items: AuditFeedItem[] = [];
    for (const p of plans) {
      for (const entry of auditByPlan[p.id] ?? []) {
        items.push({
          id: `${p.id}-${entry.id}`,
          entry,
          actionLabel: planLabelById.get(p.id),
        });
      }
    }
    items.sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
    return items.slice(0, 8);
  }, [plans, auditByPlan, planLabelById]);

  if (!row || !staffItem) return null;

  const evidenciasHref = `/${area}/evidencias?formId=${encodeURIComponent(row.formId)}&organizationId=${encodeURIComponent(row.organizationId)}`;
  const recHref = staffRecomendacoesHref(area, row.recommendationId);

  return (
    <div className={`${layout.panelStack} gap-6`}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <Eye className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Central de supervisão</span>
          <span className="mx-2 text-slate-300">·</span>
          Acompanhamento institucional — visualize, comente e valide. A execução é responsabilidade
          da organização.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <div className={`${layout.panelStack} gap-6 min-w-0`}>
          <PanelSection
            title="Comentários e decisões"
            description="Feed institucional — pareceres, pendências e encaminhamentos."
            variant="card"
          >
            <StaffActionPlanInstitutionalFeed
              recommendationId={row.recommendationId}
              plans={plans}
              evidences={evidences}
            />
          </PanelSection>

          <PanelSection
            title="Linha do tempo e auditoria"
            description="Histórico de movimentações, alterações e trilha de auditoria."
            variant="card"
          >
            {staffTimeline.length > 0 ? (
              <div className="mb-5 border-b border-slate-100 pb-5">
                <EntityHistoryTimeline events={staffTimeline.slice(0, 6)} />
              </div>
            ) : null}
            <ActionPlanAuditFeed
              items={auditFeedItems}
              limit={8}
              emptyMessage="Nenhuma alteração registrada nas ações ainda."
            />
          </PanelSection>

          <PanelSection
            title="Evidências vinculadas"
            description="Documentos enviados pela organização — validação na fila de evidências."
            variant="card"
            actions={
              <Link href={evidenciasHref} className={`${formSurface.secondaryButtonSm} inline-flex items-center gap-1`}>
                Abrir fila
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          >
            {evidencesLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Carregando…
              </p>
            ) : evidences.length === 0 ? (
              <p className={`rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-6 text-center ${typography.auxiliary}`}>
                Nenhuma evidência vinculada à pergunta de origem.
              </p>
            ) : (
              <ul>
                {evidences.map((ev) => (
                  <EvidenceCompactRow
                    key={ev.id}
                    item={ev}
                    detailHref={`${evidenciasHref}&search=${encodeURIComponent(ev.title)}`}
                  />
                ))}
              </ul>
            )}
          </PanelSection>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className={`${formSurface.dashboardPanel} space-y-4 p-5`}>
            <p className="text-micro font-semibold uppercase tracking-wide text-slate-500">
              Indicadores de supervisão
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-slate-500">Evidências</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{evidences.length}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-slate-500">Pendentes</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{pendingEvidences}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-slate-500">Ações</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{plans.length}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-slate-500">Atrasadas</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${overdueActions > 0 ? "text-rose-700" : "text-slate-900"}`}>
                  {overdueActions}
                </p>
              </div>
            </div>

            {overdueActions > 0 || pendingEvidences > 0 ? (
              <div className={`${formSurface.messageWarning} text-xs`}>
                {overdueActions > 0 ? (
                  <p className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {overdueActions} ação(ões) em atraso
                  </p>
                ) : null}
                {pendingEvidences > 0 ? (
                  <p className="mt-1">{pendingEvidences} evidência(s) aguardando validação</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-2">
            <Link href={evidenciasHref} className={`${formSurface.secondaryButtonSm} inline-flex items-center justify-center gap-1.5`}>
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Validar evidências
            </Link>
            <Link href={recHref} className={`${formSurface.primaryButtonSm} inline-flex items-center justify-center gap-1.5`}>
              Ver recomendação
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
