"use client";

import { StaffActionPlanReadonlyActions } from "@/components/admin-plano-acao/staff-action-plan-readonly-actions";
import { useRecommendationDetailContext } from "@/components/recommendations-hub/recommendation-detail-context";

export function StaffActionPlanAcoesPanel() {
  const ctx = useRecommendationDetailContext();
  if (!ctx.row) return null;
  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
        Visualização operacional das ações cadastradas pela organização. O administrador acompanha a
        execução; alterações operacionais são responsabilidade do respondente.
      </p>
      <StaffActionPlanReadonlyActions plans={ctx.row.plans} />
    </div>
  );
}
