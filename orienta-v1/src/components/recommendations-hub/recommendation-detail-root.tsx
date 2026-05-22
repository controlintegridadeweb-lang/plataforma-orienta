"use client";

import { TableSkeleton } from "@/components/ui/loading";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";
import {
  RecommendationDetailProvider,
  useRecommendationDetailContext,
  type RecommendationDetailRole,
  type RecommendationWorkspaceSurface,
} from "./recommendation-detail-context";
import { RecommendationDetailHeader } from "./recommendation-detail-header";
import { RecommendationDetailTabs } from "./recommendation-detail-tabs";
import { WorkspaceTabIntro } from "./workspace-tab-intro";
import { workspaceTabsForBasePath } from "./workspace-tab-meta";

function RecommendationDetailBody({ children }: { children: React.ReactNode }) {
  const ctx = useRecommendationDetailContext();

  if (ctx.loading && !ctx.row) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-6 ${formSurface.card}`}>
        <TableSkeleton rows={5} cols={2} />
      </div>
    );
  }

  if (ctx.error || !ctx.row) {
    return (
      <div className={formSurface.messageError}>
        {ctx.error ?? "Recomendação não encontrada."}
      </div>
    );
  }

  const isDocument = ctx.workspaceSurface === "document" && ctx.role === "staff";
  const isSupervision = ctx.workspaceSurface === "supervision" && ctx.role === "staff";

  const tabs = isDocument
    ? []
    : isSupervision
      ? workspaceTabsForBasePath(ctx.detailBasePath, ["overview", "actions", "monitoring"], {
          actionsHrefSegment: "acoes",
        })
      : ctx.workspaceSurface === "operational" && ctx.role === "staff"
        ? workspaceTabsForBasePath(
            ctx.detailBasePath,
            ["monitoring", "actions", "overview"],
            { actionsHrefSegment: ctx.actionsTabHrefSegment, actionsLabel: ctx.actionsTabLabel },
          )
        : workspaceTabsForBasePath(
            ctx.detailBasePath,
            ["overview", "actions", "monitoring"],
            {
              actionsHrefSegment: ctx.actionsTabHrefSegment,
              actionsLabel: ctx.actionsTabLabel,
            },
          );

  const stackGap =
    ctx.workspaceSurface === "operational" ||
    ctx.workspaceSurface === "supervision" ||
    ctx.workspaceSurface === "document"
      ? "gap-10"
      : "gap-6";
  const maxWidth =
    (ctx.workspaceSurface === "operational" ||
      ctx.workspaceSurface === "supervision" ||
      ctx.workspaceSurface === "document") &&
    ctx.role === "staff"
      ? "max-w-7xl"
      : "max-w-6xl";

  return (
    <div className={`${layout.pageStack} ${stackGap} ${maxWidth}`}>
      <RecommendationDetailHeader />
      {tabs.length > 0 ? (
        <RecommendationDetailTabs tabs={tabs} aria-label="Seções do workspace" />
      ) : null}
      {tabs.length > 0 &&
      (ctx.workspaceSurface === "operational" || ctx.workspaceSurface === "supervision") ? (
        <WorkspaceTabIntro />
      ) : null}
      <div className="min-h-[14rem]">{children}</div>
    </div>
  );
}

export function RecommendationDetailRoot({
  recommendationId,
  role,
  listPath,
  detailBasePath,
  actionsTabHrefSegment,
  actionsTabLabel,
  workspaceSurface,
  children,
}: {
  recommendationId: string;
  role: RecommendationDetailRole;
  listPath: string;
  detailBasePath?: string;
  actionsTabHrefSegment?: string;
  actionsTabLabel?: string;
  workspaceSurface?: RecommendationWorkspaceSurface;
  children: React.ReactNode;
}) {
  return (
    <RecommendationDetailProvider
      recommendationId={recommendationId}
      role={role}
      listPath={listPath}
      detailBasePath={detailBasePath}
      actionsTabHrefSegment={actionsTabHrefSegment}
      actionsTabLabel={actionsTabLabel}
      workspaceSurface={workspaceSurface}
    >
      <RecommendationDetailBody>{children}</RecommendationDetailBody>
    </RecommendationDetailProvider>
  );
}
