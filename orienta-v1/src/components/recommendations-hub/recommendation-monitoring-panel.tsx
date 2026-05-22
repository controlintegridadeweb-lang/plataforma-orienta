"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelSection } from "@/components/ui/panel-section";
import { layout } from "@/lib/design-system";
import { progressFromPlans } from "@/lib/recommendations/respondent-presentation";
import { RESPONDENT_VIEW_META } from "@/lib/recommendations/respondent-presentation";
import { computeActionSla } from "@/lib/domain/action-plans";
import {
  listActionPlanAudit,
  listRespondentActionPlanAudit,
} from "@/lib/action-plans/client";
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import {
  fetchAdminRecPlanTimelineEvents,
  type AdminRecPlanTimelineEvent,
} from "@/components/workflow/admin-rec-plan-timeline-shared";
import { EntityHistoryTimeline } from "@/components/workflow/entity-history-timeline";
import { ActionPlanAuditFeed, type AuditFeedItem } from "./action-plan-audit-feed";
import { RecommendationMonitoringSnapshot } from "./recommendation-monitoring-snapshot";
import { useRecommendationDetailContext } from "./recommendation-detail-context";

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function RecommendationMonitoringPanel() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const [auditByPlan, setAuditByPlan] = useState<Record<string, ActionPlanAuditEntry[]>>({});
  const [staffTimeline, setStaffTimeline] = useState<AdminRecPlanTimelineEvent[] | null>(null);

  const plans = row?.plans ?? [];
  const planIdsKey = plans.map((p) => p.id).join(",");

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = addDaysISO(7);

  const metrics = useMemo(() => {
    let completed = 0;
    let active = 0;
    let overdue = 0;
    let noResp = 0;

    for (const p of plans) {
      if (!p.responsibleName?.trim()) noResp += 1;
      if (p.status === "completed" || p.status === "cancelled") {
        if (p.status === "completed") completed += 1;
        continue;
      }
      active += 1;
      const sla = computeActionSla({ dueDate: p.dueDate, status: p.status });
      if (sla === "overdue") overdue += 1;
    }

    const upcoming = plans.filter((p) => {
      if (p.status === "completed" || p.status === "cancelled") return false;
      const d = p.dueDate?.slice(0, 10);
      if (!d) return false;
      return d >= today && d <= weekEnd;
    });
    upcoming.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    return { completed, active, overdue, noResp, upcoming };
  }, [plans, today, weekEnd]);

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
            const list =
              ctx.role === "respondent"
                ? await listRespondentActionPlanAudit(p.id)
                : await listActionPlanAudit(p.id);
            entries[p.id] = list;
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
  }, [row?.recommendationId, ctx.role, planIdsKey]);

  useEffect(() => {
    if (ctx.role !== "staff" || !ctx.staffItem) {
      setStaffTimeline(null);
      return;
    }
    let cancelled = false;
    void fetchAdminRecPlanTimelineEvents({
      recommendationId: ctx.staffItem.recommendationId,
      planId: ctx.staffItem.planId,
      generation: row?.recommendationCreatedAt
        ? {
            ts: row.recommendationCreatedAt,
            description: "Criada pelo motor FAMI a partir das respostas e evidências.",
          }
        : null,
    }).then((events) => {
      if (!cancelled) setStaffTimeline(events);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx.role, ctx.staffItem, row?.recommendationCreatedAt]);

  if (!row) return null;

  const progress = progressFromPlans(plans);

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
      const rows = auditByPlan[p.id] ?? [];
      for (const entry of rows) {
        items.push({
          id: `${p.id}-${entry.id}`,
          entry,
          actionLabel: planLabelById.get(p.id),
        });
      }
    }
    items.sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
    return items;
  }, [plans, auditByPlan, planLabelById]);

  const respondentView = ctx.respondentItem?.view;

  return (
    <div className={layout.panelStack}>
      <PanelSection
        title="Monitoramento"
        description="Resumo da execução e registro recente de alterações."
        variant="card"
        contentClassName="space-y-0"
      >
        <RecommendationMonitoringSnapshot
          progress={progress}
          metrics={metrics}
          view={respondentView}
          viewLabel={respondentView ? RESPONDENT_VIEW_META[respondentView].label : undefined}
        />
      </PanelSection>

      <PanelSection
        title="Atividade recente"
        description="Histórico unificado de alterações nas ações e na recomendação."
        variant="card"
      >
        {ctx.role === "staff" && staffTimeline && staffTimeline.length > 0 ? (
          <div className="mb-6 border-b border-slate-100/90 pb-6">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Recomendação
            </p>
            <EntityHistoryTimeline events={staffTimeline.slice(0, 8)} />
          </div>
        ) : null}

        {plans.length > 0 ? (
          <>
            {ctx.role === "staff" && staffTimeline && staffTimeline.length > 0 ? (
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Ações do plano
              </p>
            ) : null}
            <ActionPlanAuditFeed
              items={auditFeedItems}
              emptyMessage="Nenhuma alteração registrada nas ações ainda."
            />
          </>
        ) : (
          <ActionPlanAuditFeed items={[]} emptyMessage="Cadastre ações na aba Ações para ver a atividade aqui." />
        )}
      </PanelSection>
    </div>
  );
}
