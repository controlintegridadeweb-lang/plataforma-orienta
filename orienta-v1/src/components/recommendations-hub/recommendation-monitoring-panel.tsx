"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listActionPlanAudit,
  listRespondentActionPlanAudit,
} from "@/lib/action-plans/client";
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import { progressFromPlans } from "@/lib/recommendations/respondent-presentation";
import { computeActionSla } from "@/lib/domain/action-plans";
import {
  fetchAdminRecPlanTimelineEvents,
  type AdminRecPlanTimelineEvent,
} from "@/components/workflow/admin-rec-plan-timeline-shared";
import { EntityHistoryTimeline } from "@/components/workflow/entity-history-timeline";
import { ActionPlanAuditFeed, type AuditFeedItem } from "./action-plan-audit-feed";
import { RecommendationMonitoringSidebar } from "./recommendation-monitoring-sidebar";
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
      if (computeActionSla({ dueDate: p.dueDate, status: p.status }) === "overdue") {
        overdue += 1;
      }
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
  }, [row?.recommendationId, ctx.role, planIdsKey, plans]);

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

  if (!row) return null;

  const progress = progressFromPlans(plans);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10">
      <div className="min-w-0 space-y-8">
        {ctx.role === "staff" && staffTimeline && staffTimeline.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Linha do tempo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Histórico institucional da recomendação e supervisão.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-5 shadow-sm sm:px-6">
              <EntityHistoryTimeline events={staffTimeline} />
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Atividade recente</h2>
            <p className="mt-1 text-sm text-slate-500">
              Registro cronológico de alterações nas ações — comentários, status e validações.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 shadow-sm sm:px-5">
            {plans.length > 0 ? (
              <ActionPlanAuditFeed
                items={auditFeedItems}
                variant="conversation"
                emptyMessage="Nenhuma alteração registrada nas ações ainda."
              />
            ) : (
              <ActionPlanAuditFeed
                items={[]}
                variant="conversation"
                emptyMessage="Cadastre ações na aba Ações para ver a atividade aqui."
              />
            )}
          </div>
        </section>
      </div>

      <RecommendationMonitoringSidebar progress={progress} metrics={metrics} />
    </div>
  );
}
